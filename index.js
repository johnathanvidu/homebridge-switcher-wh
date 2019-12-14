'use strict'

var switcher = require('./ref/switcher');


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
        this.service = this._init_valve_service();
        this.stupid_switch = this._init_stupid_switch();

        // connect to switcher and wait for ready event 
        var handler = switcher.connect(config, log);
        handler.on('ready', (switcher) => {
            this.switcher = switcher;
            this._listen_to_status_updates();
        });
    }
  
    _listen_to_status_updates() {
        this.switcher.on('status', (device_status) => {
            this._update_state_related_characteristics(device_status.state);
            this.service.getCharacteristic(Characteristic.RemainingDuration).updateValue(device_status.remaining_seconds);
        });
    }

    _update_state_related_characteristics(state) {
        this.service.getCharacteristic(Characteristic.InUse).updateValue(state);
        this.service.getCharacteristic(Characteristic.Active).updateValue(state);
        if (this.stupid_switch) {
            this.stupid_switch.getCharacteristic(Characteristic.On).updateValue(state);
        }
    }

    _init_valve_service() {
        var service = new Service.Valve(this.config.name);
        service.getCharacteristic(Characteristic.Active)
        .on('get', this.getActiveCharacteristicHandler.bind(this))
        .on('set', this.setActiveCharacteristicHandler.bind(this));
        service.getCharacteristic(Characteristic.InUse)
        .on('get', this.getInUseCharacteristicHandler.bind(this));
        service.setCharacteristic(Characteristic.ValveType, this.config['icon'] || 2); // that will set shower head icon - can set it in the config.json
        service.setCharacteristic(Characteristic.SetDuration, this.config['default_duration'] * 60 || 0); // this will replace the 0 seconds with the time configured in default_duration
        service.addCharacteristic(Characteristic.RemainingDuration);
        return service;
    }
    
    _init_stupid_switch() {
        if (!this.config['include_stupid_switch']) return null;
        var stupid_switch = new Service.Switch(this.config.name);
        stupid_switch.getCharacteristic(Characteristic.On)
        .on('set', this.setStupidSwitchOnHandler.bind(this));
        return stupid_switch;
    }

    getServices () {
        const informationService = new Service.AccessoryInformation()
            .setCharacteristic(Characteristic.Manufacturer, 'johnathanvidu')
            .setCharacteristic(Characteristic.Model, 'SwitcherV' + this.config['switcher_version'])
            .setCharacteristic(Characteristic.SerialNumber, 'homebridge-switcher-wh');

        return [informationService, this.service, this.stupid_switch];
    }

    getActiveCharacteristicHandler(callback) {
        callback(null, this.service.getCharacteristic(Characteristic.Active).value);
    }

    setActiveCharacteristicHandler (value, callback) {
        this._switcherPower(value, this.service.getCharacteristic(Characteristic.SetDuration).value);
        callback(null, value);
    }

    getInUseCharacteristicHandler(callback) {
        callback(null, this.service.getCharacteristic(Characteristic.InUse).value); // SetDuration is set by the home app as seconds
    }

    setStupidSwitchOnHandler(value, callback) {
        this._switcherPower(value, 0);
        callback(null, value);
    }

    _switcherPower(value, duration) {
        if (!this.switcher) {
            this.log.warn('switcher has yet to connect');
            return;
        }

        this.switcher.on('state', (switch_state) => {
            this._update_state_related_characteristics(switch_state);
        });

        if (value == switcher.OFF) {
            this.switcher.turn_off(); 
        }
        else {
            this.switcher.turn_on(Math.floor(duration / 60));
        }
    }
  }