'use strict'

var switcher = require('../switcher-js/src/switcher');
// var Service, Characteristic, Accessory, UUIDGen;

let Service, Characteristic;

module.exports = (homebridge) => {
  /* this is the starting point for the plugin where we register the accessory */
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory('homebridge-switcher-wh', 'SwitcherPlatform', SwitcherPlatform)
}


// module.exports = function(homebridge) {
//     // Accessory must be created from PlatformAccessory Constructor
//     Accessory = homebridge.platformAccessory;

//     // Service and Characteristic are from hap-nodejs
//     Service = homebridge.hap.Service;
//     Characteristic = homebridge.hap.Characteristic;
//     UUIDGen = homebridge.hap.uuid;
    
//     // For platform plugin to be considered as dynamic platform plugin,
//     // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
//     homebridge.registerPlatform("homebridge-switcher-wh", "SwitcherPlatform", SwitcherPlatform, true);
// }


class SwitcherPlatform {
    constructor (log, config) {
        this.log = log
        this.config = config
        this.service = new Service.Valve(this.config.name)
        this.switcher = new switcher.Switcher()
    }
  
    getServices () {
        const informationService = new Service.AccessoryInformation()
            .setCharacteristic(Characteristic.Manufacturer, 'switcher')
            .setCharacteristic(Characteristic.Model, 'SwitcherPlatform')
            .setCharacteristic(Characteristic.SerialNumber, 'homebridge-switcher-wh');
    
        /*
        * For each of the service characteristics we need to register setters and getter functions
        * 'get' is called when HomeKit wants to retrieve the current state of the characteristic
        * 'set' is called when HomeKit wants to update the value of the characteristic
        */
        this.service.getCharacteristic(Characteristic.Active)
        .on('get', this.getOnCharacteristicHandler.bind(this))
        .on('set', this.getActiveCharacteristicHandler.bind(this));
        this.service.getCharacteristic(Characteristic.InUse)
        .on('get', this.getOnCharacteristicHandler.bind(this))
        .on('set', this.getActiveCharacteristicHandler.bind(this));
        this.service.getCharacteristic(Characteristic.ValveType).updateValue(2);  // that will set shower head icon - can set it in the config.json
  
        /* Return both the main service (this.service) and the informationService */
        return [informationService, this.service]
    }
  
    setActiveCharacteristicHandler (value, callback) {
        /* this is called when HomeKit wants to update the value of the characteristic as defined in our getServices() function */
    
        /*
        * The desired value is available in the `value` argument.
        * This is just an example so we will just assign the value to a variable which we can retrieve in our get handler
        */
        new switcher.Switcher().on();
    
        /* Log to the console the value whenever this function is called */
        this.log(`calling setOnCharacteristicHandler`, value)
    
        /*
        * The callback function should be called to return the value
        * The first argument in the function should be null unless and error occured
        */
        callback(null)
    }
  
    getActiveCharacteristicHandler (callback) {
        /*
        * this is called when HomeKit wants to retrieve the current state of the characteristic as defined in our getServices() function
        * it's called each time you open the Home app or when you open control center
        */
    
        /* Log to the console the value whenever this function is called */
        this.log(`calling getOnCharacteristicHandler`, this.isOn)
    
        /*
        * The callback function should be called to return the value
        * The first argument in the function should be null unless and error occured
        * The second argument in the function should be the current value of the characteristic
        * This is just an example so we will return the value from `this.isOn` which is where we stored the value in the set handler
        */
        callback(null, this.isOn)
    }
  }



// // Platform constructor
// // config may be null
// // api may be null if launched from old homebridge version
// function SwitcherPlatform(log, config, api) {
//     log("SwitcherPlatform Init");
//     var platform = this;
//     this.log = log;
//     this.config = config;
//     this.accessories = [];
  
//     var platform = this;

//     if (api) {
//         this.api = api;

//         this.api.on('didFinishLaunching', function() {
//             platform.log("DidFinishLaunching");

//             platform.yeeAgent = new yeeLight.YeeAgent("0.0.0.0", platform);
//             platform.yeeAgent.startDisc();
//         }.bind(this));
//     }
// }

// SwitcherPlatform.prototype.configureAccessory = function(accessory) { 
//     this.log(accessory.displayName, "Configure Accessory");

//     // Set the accessory to reachable if plugin can currently process the accessory,
//     // otherwise set to false and update the reachability later by invoking 
//     // accessory.updateReachability()
//     accessory.reachable = true;

//     accessory.on('identify', function(paired, callback) {
//         platform.log(accessory.displayName, "Identify!!!");
//         callback();
//       });
    
//       if (accessory.getService(Service.Lightbulb)) {
//         accessory.getService(Service.Lightbulb)
//         .getCharacteristic(Characteristic.On)
//         .on('set', function(value, callback) {
//           platform.log(accessory.displayName, "Light -> " + value);
//           callback();
//         });
//       }
    
//       this.accessories.push(accessory);
// }

// // Handler will be invoked when user try to config your plugin.
// // Callback can be cached and invoke when necessary.
// SwitcherPlatform.prototype.configurationRequestHandler = function(context, request, callback) {
//     this.log("Context: ", JSON.stringify(context));
//     this.log("Request: ", JSON.stringify(request));

//     // Check the request response
//     if (request && request.response && request.response.inputs && request.response.inputs.name) {
//         this.addAccessory(request.response.inputs.name);

//         // Invoke callback with config will let homebridge save the new config into config.json
//         // Callback = function(response, type, replace, config)
//         // set "type" to platform if the plugin is trying to modify platforms section
//         // set "replace" to true will let homebridge replace existing config in config.json
//         // "config" is the data platform trying to save
//         callback(null, "platform", true, {"platform":"SwitcherPlatform", "otherConfig":"SomeData"});
//         return;
//     }

//     // - UI Type: Input
//     // Can be used to request input from user
//     // User response can be retrieved from request.response.inputs next time
//     // when configurationRequestHandler being invoked

//     var respDict = {
//         "type": "Interface",
//         "interface": "input",
//         "title": "Add Accessory",
//         "items": [
//         {
//             "id": "name",
//             "title": "Name",
//             "placeholder": "Fancy Light"
//         }//, 
//         // {
//         //   "id": "pw",
//         //   "title": "Password",
//         //   "secure": true
//         // }
//         ]
//     }

//     // - UI Type: List
//     // Can be used to ask user to select something from the list
//     // User response can be retrieved from request.response.selections next time
//     // when configurationRequestHandler being invoked

//     // var respDict = {
//     //   "type": "Interface",
//     //   "interface": "list",
//     //   "title": "Select Something",
//     //   "allowMultipleSelection": true,
//     //   "items": [
//     //     "A","B","C"
//     //   ]
//     // }

//     // - UI Type: Instruction
//     // Can be used to ask user to do something (other than text input)
//     // Hero image is base64 encoded image data. Not really sure the maximum length HomeKit allows.

//     // var respDict = {
//     //   "type": "Interface",
//     //   "interface": "instruction",
//     //   "title": "Almost There",
//     //   "detail": "Please press the button on the bridge to finish the setup.",
//     //   "heroImage": "base64 image data",
//     //   "showActivityIndicator": true,
//     // "showNextButton": true,
//     // "buttonText": "Login in browser",
//     // "actionURL": "https://google.com"
//     // }

//     // Plugin can set context to allow it track setup process
//     context.ts = "Hello";

//     // Invoke callback to update setup UI
//     callback(respDict);
// }

// // Sample function to show how developer can add accessory dynamically from outside event
// SwitcherPlatform.prototype.addAccessory = function(accessoryName) {
//     this.log("Add Accessory");
//     var platform = this;
//     var uuid;

//     uuid = UUIDGen.generate(accessoryName);

//     var newAccessory = new Accessory(accessoryName, uuid);
//     newAccessory.on('identify', function(paired, callback) {
//         platform.log(newAccessory.displayName, "Identify!!!");
//         callback();
//     });
//     // Plugin can save context on accessory to help restore accessory in configureAccessory()
//     // newAccessory.context.something = "Something"
    
//     // Make sure you provided a name for service, otherwise it may not visible in some HomeKit apps
//     newAccessory.addService(Service.Lightbulb, "Test Light")
//     .getCharacteristic(Characteristic.On)
//     .on('set', function(value, callback) {
//         platform.log(newAccessory.displayName, "Light -> " + value);
//         callback();
//     });

//     this.accessories.push(newAccessory);
//     this.api.registerPlatformAccessories("homebridge-switcher-wh", "SwitcherPlatform", [newAccessory]);
// }

// SwitcherPlatform.prototype.updateAccessoriesReachability = function() {
//     this.log("Update Reachability");
//     for (var index in this.accessories) {
//         var accessory = this.accessories[index];
//         accessory.updateReachability(false);
//     }
// }

// // Sample function to show how developer can remove accessory dynamically from outside event
// SwitcherPlatform.prototype.removeAccessory = function() {
//     this.log("Remove Accessory");
//     this.api.unregisterPlatformAccessories("homebridge-switcher-wh", "SwitcherPlatform", this.accessories);

//     this.accessories = [];
// }



// /**
//  * Service "Valve"
//  */

// Service.Valve = function(displayName, subtype) {
//     Service.call(this, displayName, '000000D0-0000-1000-8000-0026BB765291', subtype);
  
//     // Required Characteristics
//     this.addCharacteristic(Characteristic.Active);
//     this.addCharacteristic(Characteristic.InUse);
//     this.addCharacteristic(Characteristic.ValveType);
  
//     // Optional Characteristics
//     this.addOptionalCharacteristic(Characteristic.SetDuration);
//     this.addOptionalCharacteristic(Characteristic.RemainingDuration);
//     this.addOptionalCharacteristic(Characteristic.IsConfigured);
//     this.addOptionalCharacteristic(Characteristic.ServiceLabelIndex);
//     this.addOptionalCharacteristic(Characteristic.StatusFault);
//     this.addOptionalCharacteristic(Characteristic.Name);
//   };
  
//   inherits(Service.Valve, Service);
  
//   Service.Valve.UUID = '000000D0-0000-1000-8000-0026BB765291';