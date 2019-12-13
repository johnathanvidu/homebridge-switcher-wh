'use strict'

var switcher = require('switcher-js');


let Service, Characteristic;

module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
  
    homebridge.registerAccessory("homebridge-switcher-wh", "switcher", SwitcherAccessory);
  }

class SwitcherAccessory {
    constructor (log, config) {
        this.log = log
        this.config = config
        this.service = new Service.Valve(this.config.name)
        this.switcher = new switcher.Switcher(config, log)
        this.status_interval = config['status_interval'] || 5000; 
        this.status = null;

        this.service.getCharacteristic(Characteristic.Active)
        .on('get', this.getActiveCharacteristicHandler.bind(this))
        .on('set', this.setActiveCharacteristicHandler.bind(this));
        this.service.getCharacteristic(Characteristic.InUse)
        .on('get', this.getInUseCharacteristicHandler.bind(this));
        this.service.getCharacteristic(Characteristic.ValveType).updateValue(3);  // that will set shower head icon - can set it in the config.json
        this.service.addCharacteristic(Characteristic.SetDuration);
        this.service.addCharacteristic(Characteristic.RemainingDuration);

        setInterval(() => {
            this.log('fetching status...')
            this.switcher.status((device_status) => {
                this.status = device_status;
                this.service.getCharacteristic(Characteristic.InUse).updateValue(device_status.state);
                this.service.getCharacteristic(Characteristic.Active).updateValue(device_status.state);
                this.service.getCharacteristic(Characteristic.RemainingDuration).updateValue(device_status.remaining_seconds)
                this.log('fetched status', "state " + device_status.state + ' remaining sec ' + device_status.remaining_seconds);
            });
        }, this.status_interval);
    }
  
    getServices () {
        const informationService = new Service.AccessoryInformation()
            .setCharacteristic(Characteristic.Manufacturer, 'switcher')
            .setCharacteristic(Characteristic.Model, 'SwitcherV' + this.config['switcher-version'])
            .setCharacteristic(Characteristic.SerialNumber, 'homebridge-switcher-wh');
        return [informationService, this.service]
    }

    getActiveCharacteristicHandler(callback) {
        callback(null, this.service.getCharacteristic(Characteristic.Active).value);
    }

    setActiveCharacteristicHandler (value, callback) {
        /* this is called when HomeKit wants to update the value of the characteristic as defined in our getServices() function */
    
        /*
        * The desired value is available in the `value` argument.
        * This is just an example so we will just assign the value to a variable which we can retrieve in our get handler
        */
       /* Log to the console the value whenever this function is called */
        this.log('setActiveCharacteristicHandler got value of ', value)

        if (value == 0) {
            this.switcher.off(); 
            this.log('setting switcher off nontheless');
        }
        else {
            var duration = this.service.getCharacteristic(Characteristic.SetDuration).value;
            if (duration == 0) this.switcher.on_with(Math.floor(duration / 60));
            else this.switcher.on();
            
            this.log('setting switcher on nontheless');
        }

        this.service.getCharacteristic(Characteristic.InUse).updateValue(value)

        /*
        * The callback function should be called to return the value
        * The first argument in the function should be null unless and error occured
        */
        callback(null, value)
    }

    getInUseCharacteristicHandler(callback) {
        callback(null, this.service.getCharacteristic(Characteristic.InUse).value);
    }
  }