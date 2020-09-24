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
        if (config['device']) {
            var device_config = config['device'];
            this.log = log
            this.switcher_version = config['switcher_version'] || 'Unknown';
            this.valve_service = this._init_valve_service(config.name, config['icon'], config['default_duration']);
            this.stupid_switch = config['include_stupid_switch'] ? this._init_stupid_switch(config.name) : null;
    
            if (device_config.auto_discover) {
                // waits for ready event, so this.switcher might not be initialize when a command is set to invoke,
                // but that's not a problem cause we are covered in the every function that is using this.switcher
                this.auto_discover(device_config, log);   
            }
            else {
                // setting timeout for scenarios that this is the first plugin that register and since it writes log,
                // they can occasionally be written before the homebridge logs, and thus makes it hard to find errors
                setTimeout(() => {
                    this.switcher = this.create_switcher(device_config, log, (switcher) => {
                        this.listen_to_switcher_events_updates(switcher);
                    });
                }, 1);
            }
            
        }
        else {
            log.error('config MUST contain a device section');
        }
    }
  
    create_switcher(device_config, log, callback) {
        var error = '';
        if (!device_config.id) {
            this.log.error('device section must contain id field');
            error += 'id';
        }
        if (!device_config.ip) {
            this.log.error('device section must contain ip field');
            error += 'ip';
        }
        if (error) {
            log.error('switcher plugin failed to load, please try setting device auto_discover to true and restart homebridge');
            return null;
        }
        var phone_id = device_config['phone_id']; // might be null 
        var device_pass = device_config['device_pass']; // might be null 
        var switcher = new switcher.Switcher(device_config.id, device_config.ip, phone_id, device_pass, log);
        callback(switcher);
        return switcher;
    }

    auto_discover(device_config, log) {
        var ignore = [];
        if (device_config.id) {
            ignore.push('device.id ' + device_config.id);
        }
        if (device_config.ip) {
            ignore.push('device.ip ' + device_config.ip);
        }
        var ignore_text = ignore.length == 0 ? '' : 'ignoring ' + ignore.join(', ') + '...';
        this.log.info('starting switcher device discovery...');
        if (ignore_text) {
            this.log.info(ignore_text);
        }
        var discover_service = switcher.Switcher.discover(device_config['phone_id'], device_config['device_pass'], log);
        discover_service.on('ready', (switcher) => {
            this.log.info('discovery ended successfully!');
            this.log.info('switcher ip', switcher.switcher_ip);
            this.log.info('device id', switcher.device_id);
            this.switcher = switcher;
            this.listen_to_switcher_events_updates(switcher);
        });
        discover_service.on('error', (error) => {
            this.log.error('discovery service failed with this error', error);
        });
    }

    listen_to_switcher_events_updates(switcher) {
        switcher.on('status', (device_status) => {
            this._update_state_related_characteristics(device_status.state);
            this.valve_service.getCharacteristic(Characteristic.RemainingDuration).updateValue(device_status.remaining_seconds);
        });
        switcher.on('error', (error) => {
            this.log.error(error.message);
        });
    }

    _update_state_related_characteristics(state) {
        this.valve_service.getCharacteristic(Characteristic.InUse).updateValue(state);
        this.valve_service.getCharacteristic(Characteristic.Active).updateValue(state);
        if (this.stupid_switch) {
            this.stupid_switch.getCharacteristic(Characteristic.On).updateValue(state);
        }
    }

    _init_valve_service(service_name, icon, default_duration) {
        var service = new Service.Valve(service_name);
        service.getCharacteristic(Characteristic.Active)
        .on('get', this.getActiveCharacteristicHandler.bind(this))
        .on('set', this.setActiveCharacteristicHandler.bind(this));
        service.getCharacteristic(Characteristic.InUse)
        .on('get', this.getInUseCharacteristicHandler.bind(this));
        service.setCharacteristic(Characteristic.ValveType, icon || 2); // doesn't really do anything, home app bug?
        service.setCharacteristic(Characteristic.SetDuration, default_duration * 60 || 0); // this will replace the 0 seconds with the time configured in default_duration
        service.addCharacteristic(Characteristic.RemainingDuration);
        return service;
    }
    
    _init_stupid_switch(stupid_switch_name) {
        var stupid_switch = new Service.Switch(stupid_switch_name);
        stupid_switch.getCharacteristic(Characteristic.On)
        .on('set', this.setStupidSwitchOnHandler.bind(this));
        return stupid_switch;
    }

    getServices () {
        const informationService = new Service.AccessoryInformation()
            .setCharacteristic(Characteristic.Manufacturer, 'johnathanvidu')
            .setCharacteristic(Characteristic.Model, 'SwitcherV' + this.switcher_version)
            .setCharacteristic(Characteristic.SerialNumber, 'homebridge-switcher-wh');

        var services = [informationService, this.valve_service];
        if (this.stupid_switch) {
            services.push(this.stupid_switch);
        }
        return services;
    }

    getActiveCharacteristicHandler(callback) {
        if (!this.switcher) {
            callback('switcher has yet to connect');
            return;
        }
        callback(null, this.valve_service.getCharacteristic(Characteristic.Active).value);
    }

    setActiveCharacteristicHandler (value, callback) {
        if (!this.switcher) {
            callback('switcher has yet to connect');
            return;
        }
        this._switcherPower(value, this.valve_service.getCharacteristic(Characteristic.SetDuration).value);
        callback(null, value);
    }

    getInUseCharacteristicHandler(callback) {
        if (!this.switcher) {
            callback('switcher has yet to connect');
            return;
        }
        callback(null, this.valve_service.getCharacteristic(Characteristic.InUse).value); // SetDuration is set by the home app as seconds
    }

    setStupidSwitchOnHandler(value, callback) {
        if (!this.switcher) {
            callback('switcher has yet to connect');
            return;
        }
        this._switcherPower(value, 0);  // callback(error) when switcher is not initialized
        callback(null, value);
    }

    _switcherPower(value, duration) {
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
