const { InstanceStatus } = require('@companion-module/base');

const portfinder = require('portfinder');
const snmp = require ("net-snmp");
const Client  = require('node-rest-client').Client;

const oid_buttons = [
	{ oid: '1.3.6.1.4.1.21541.2.1.0', button: 1 },
	{ oid: '1.3.6.1.4.1.21541.2.2.0', button: 2 },
	{ oid: '1.3.6.1.4.1.21541.2.3.0', button: 3 },
	{ oid: '1.3.6.1.4.1.21541.2.4.0', button: 4 },
	{ oid: '1.3.6.1.4.1.21541.2.5.0', button: 5 },
	{ oid: '1.3.6.1.4.1.21541.2.6.0', button: 6 },
	{ oid: '1.3.6.1.4.1.21541.2.7.0', button: 7 },
	{ oid: '1.3.6.1.4.1.21541.2.8.0', button: 8 },
	{ oid: '1.3.6.1.4.1.21541.2.9.0', button: 9 },
	{ oid: '1.3.6.1.4.1.21541.2.10.0', button: 10 },
	{ oid: '1.3.6.1.4.1.21541.2.11.0', button: 11 },
	{ oid: '1.3.6.1.4.1.21541.2.12.0', button: 12 },
	{ oid: '1.3.6.1.4.1.21541.2.13.0', button: 13 },
	{ oid: '1.3.6.1.4.1.21541.2.14.0', button: 14 },
	{ oid: '1.3.6.1.4.1.21541.2.15.0', button: 15 },
	{ oid: '1.3.6.1.4.1.21541.2.16.0', button: 16 }
]

module.exports = {
	initUSP_Legacy: function() {
		let self = this;

		if ((self.config.auto_configure == true && self.config.already_configured !== true) || (self.config.rerun_configuration == true)) {
			self.autoConfigureLegacyPanel();
		}
		else {
			self.setupSNMP();
			//self.periodicallyUpdatePanel();
		}
	},

	autoConfigureLegacyPanel: async function() { //will attempt to hack web UI to send the panel config we need to make this work as a satellite surface
		let self = this;

		self.log('info', 'Attempting to auto-configure USP legacy panel...');

		let companionIP = '';
		
		try {
			//first, we will need Companion's IP that is on the same subnet as the panel's IP, so let's look at all the bound IPs and see if we can find one that is on the same subnet as the panel
			//the traffic coming from the panel is UDP based so we have to be on the same subnet in order to receive it
			let panelIP = self.config.host_usp;
			let panelIPParts = panelIP.split('.');
			let panelSubnet = panelIPParts[0] + '.' + panelIPParts[1] + '.' + panelIPParts[2] + '.';
			
			let interfaces = await self.parseVariablesInString('$(internal:all_ip)');
			let interfacesArr = interfaces.split('\\n');
			for (let i = 0; i < interfacesArr.length; i++) {
				let interfaceIP = interfacesArr[i];
				if (interfaceIP.startsWith(panelSubnet)) {
					companionIP = interfaceIP;
					break;
				}
			}

			if (companionIP == '') {
				self.log('error', 'Could not find a network interface on the same subnet as the panel - unable to auto-configure.');
				self.updateStatus(InstanceStatus.Error);
				return;
			}
		}
		catch(error) {
			self.log('error', 'Error auto configuring USP legacy panel: ' + error);
			self.updateStatus(InstanceStatus.Error);
			return;
		}

		try {
			//now we need to know what port we should use to listen for SNMP data coming from the panel, so let's find a free port
			portfinder.getPortPromise({ port: 161, stopport: 200 })
			.then((port) => {
				//now we have the ip, the port, and we will make the device name "Companion", and the heartbeat rate 5 seconds
				self.log('info', 'Configuring Remote Device Assignment Page...');
				let deviceFormData = '';
				deviceFormData += `r${self.config.usp_device_id}c0=Bitfocus+Companion`; //device name
				deviceFormData += `&r${self.config.usp_device_id}c1=${companionIP}`; //device IP
				deviceFormData += `&r${self.config.usp_device_id}c3=${port}`; //destination port number
				deviceFormData += `&r${self.config.usp_device_id}c2=19`; //heartbeat rate of 5 seconds

				let args = {
					data: deviceFormData,
					headers: { "Content-Type": "application/x-www-form-urlencoded" }
				};

				let client = new Client();
				let req = client.post('http://' + self.config.host_usp + '/gtp_hb.htm', args, function (data, response) {
					//then we will set up the Switch Assignment, and make all switches of type Remote USP and assigned to our Companion device
					self.autoConfigureLegacyPanelSwitches.bind(self)(port);
				});

				req.on('error', function (err) {
					self.log('error', 'Error auto configuring USP legacy panel: ' + err);
				});
			})
			.catch((err) => {
				self.log('error', 'Error auto configuring USP legacy panel: ' + err);
			});
		}
		catch(error) {
			self.log('error', 'Error auto configuring USP legacy panel: ' + error);
			self.updateStatus(InstanceStatus.Error);
			return;
		}
	},

	autoConfigureLegacyPanelSwitches: function(port) {
		let self = this;

		self.log('info', 'Configuring Switch Assignment Page...');

		try {
			let switchFormData = '';

			for (let i = 0; i < 16; i++) {
				if (switchFormData !== '') {
					switchFormData += '&';
				}
	
				switchFormData += `r${i}c0=${i}`; //line # i switch = i
				switchFormData += '&';
				switchFormData += `r${i}c1=0`; //device #1 - Companion
				switchFormData += '&';
				switchFormData += `r${i}c2=1`; //type - Remote USP
				switchFormData += '&';
				switchFormData += `r${i}c4=${i}`; //GPO # i
			}
	
			let args = {
				data: switchFormData,
				headers: { "Content-Type": "application/x-www-form-urlencoded" }
			};
	
			let client = new Client();
			let req = client.post('http://' + self.config.host_usp + '/switch.htm', args, function (data, response) {
				//once that is done, we need to save the port number we used to the config, and set already_configured to true, so that next time, it won't try to auto-configure again
				self.config.port_usp_legacy = port;
				self.config.already_configured = true;
				self.saveConfig(self.config);
	
				self.log('info', 'USP legacy panel auto-configured successfully!');
	
				//now that we are all done, start the SNMP agent
				self.setupSNMP.bind(self)();
				//self.periodicallyUpdatePanel.bind(self)();		
			});
	
			req.on('error', function (err) {
				self.log('error', 'Error auto configuring USP legacy panel: ' + err);
			});
		}
		catch(error) {
			self.log('error', 'Error auto configuring USP legacy panel: ' + error);
			self.updateStatus(InstanceStatus.Error);
			return;
		}
	},

	setupSNMP: function() {
		let self = this;

		try {
			if (self.config.port_usp != '' && self.config.port_usp != undefined) {
				self.log('info', 'Initializing USP Legacy SNMP Agent');
				self.log('debug', 'USP Legacy SNMP Agent listening on port ' + self.config.port_usp_legacy);
				try {
					self.USP_LEGACY_SNMP_AGENT = snmp.createAgent({ port: self.config.port_usp_legacy, accessControlModelType: snmp.AccessControlModelType.Simple}, function (error, data) {
						if (error) {
							console.error(error);
						}
						else {
							self.processUSPLegacyData(data);
						}
					});
		
					let authorizer = this.USP_LEGACY_SNMP_AGENT.getAuthorizer();
					authorizer.addCommunity('public');
	
					//update the keys upon init
					for (let i = 0; i < self.DATA.keys.length; i++) {
						let key = self.DATA.keys[i];
						key.changed = true;
					}
					let keysForm = self.buildKeysObj();
					self.currentlyUpdatingLegacyPanel = true;
					self.sendUSPLegacyKeysUpdate(keysForm);
		
					self.updateStatus(InstanceStatus.Ok);
				}
				catch(error) {
					self.updateStatus(InstanceStatus.Error);
					self.log('error', 'Error initializing USP Legacy SNMP Agent: ' + error);
				}
			}
			else {
				self.updateStatus(InstanceStatus.Warning, 'No USP port specified');
			}
		}
		catch(error) {
			self.updateStatus(InstanceStatus.Error);
			self.log('error', 'Error initializing USP SNMP Agent: ' + error);
		}
	},

	processUSPLegacyData: function(data) {
		let self = this;

		try {
			for (var i = 0; i < data.pdu.varbinds.length; i++) {
				let varbind = data.pdu.varbinds[i];
				if (varbind.oid === '1.3.6.1.4.1.21541.8.1.0') {
					//heartbeat
					self.DATA.uspConnected = true;
					self.checkVariables();
				}
				else {
					//the OID determines the button that was pressed
					//find the button in the oid_buttons array
					let button = oid_buttons.find((el) => el.oid == varbind.oid);
					if (button) {
						let keyNumber = button.button;
						let keyState = varbind.requestValue == '\x01' ? true : false;
						if (self.config.use_as_surface) {
							//press the companion button
							keyNumber = keyNumber - 1; //companion satellite API is 0-based
							self.sendCompanionSatelliteCommand(`KEY-PRESS DEVICEID=${self.DEVICE_ID} KEY=${keyNumber} PRESSED=${keyState}`);
						}
						else {
							//update the key state
							let keyObj = {
								id: keyNumber,
								state: keyState
							};
					
							//check to see if this gpi state is already in the array, and if it is, update it, otherwise add it
							let found = false;
							for (let i = 0; i < self.DATA.keyStates.length; i++) {
								if (self.DATA.keyStates[i].id == keyNumber) {
									self.DATA.keyStates[i].state = keyState;
									found = true;
									break;
								}
							}
				
							if (!found) {
								self.DATA.keyStates.push(keyObj);
							}
	
							self.checkVariables();
							self.checkFeedbacks();
						}
					}
					else {
						self.log('debug', 'Unknown OID: ' + varbind.oid);
					}
				}
			}
		}
		catch(error) {
			self.log('error', 'Error processing USP Legacy data: ' + error);
		}
	},

	updateLegacyKeys: function(key) {
		let self = this;
		
		try {
			let changed = false;

			//find out if the key color or text has changed, otherwise, we don't care
			let keyObj = self.DATA.keys.find((el) => el.number == key.number);
			if (keyObj) {
				if (keyObj.text !== key.text || keyObj.color !== key.color) {
					changed = true;
				}
			}
			else {
				changed = true;
			}
	
			changed = true; //force update for now
		
			if (changed) {
				if (key.number <= 16) { //really only care about the first 16 keys
					key.changed = true;
					self.updateInternalKey(key);
					self.queueLegacyKeyUpdate();
				}
			}	
		}
		catch(error) {
			self.log('error', 'Error updating USP legacy keys: ' + error);
		}
	},

	queueLegacyKeyUpdate: function() {
		//prevents updates from happing too quickly
		let self = this;

		try {
			if (self.legacy_key_interval) {
				clearInterval(self.legacy_key_interval);
				self.legacy_key_interval = null;
			}
	
			let delay_time = 100;
	
			if (self.currentlyUpdatingLegacyPanel == true) {
				delay_time = self.config.advanced_config_usp_legacy_panel_delay_time //wait 3 seconds if we are in the middle of an update
			}
			
			self.legacy_key_interval = setTimeout(function() {
				self.log('debug', 'Updating USP legacy keys...');
				let keysForm = self.buildKeysObj();
				self.currentlyUpdatingLegacyPanel = true;
				self.sendUSPLegacyKeysUpdate(keysForm);
			}, delay_time);
		}
		catch(error) {
			self.log('error', 'Error queuing USP legacy key update: ' + error);
		}
	},

	buildKeysObj: function() {
		let self = this;

		//build the keys object, this is what we will submit to the web form
		let keysForm = '';

		try {
			for (let i = 0; i < self.DATA.keys.length; i++) {
				let key = self.DATA.keys[i];

				let keyNumberMinus = key.number - 1; //the legacy USP is 0-based

				if (key.number <= 16) { //really only care about the first 16 keys
					if (keysForm !== '') {
						keysForm += '&';
					}
					keysForm += `r${keyNumberMinus}c0=0`; //mode = standard
					keysForm += '&';
					keysForm += `r${keyNumberMinus}c2=${key.text}`; //text ON
					keysForm += '&';
					keysForm += `r${keyNumberMinus}c3=${key.text}`; //text OFF
					keysForm += '&';
					keysForm += `r${keyNumberMinus}c4=${key.fontSize}`; //font size ON
					keysForm += '&';
					keysForm += `r${keyNumberMinus}c5=${key.fontSize}`; //font size OFF
					keysForm += '&';
					keysForm += `r${keyNumberMinus}c6=${key.uspColorLegacy}`; //color ON
					keysForm += '&';
					keysForm += `r${keyNumberMinus}c7=${key.uspColorLegacy}`; //color OFF
					keysForm += '&';
					keysForm += `r${keyNumberMinus}c8=0`; //Source Type: Local
					keysForm += '&';
					keysForm += `r${keyNumberMinus}c9=2`; //Source: Follow GPO
				}

				key.changed = false; //reset it for next time
			}
		}
		catch(error) {
			self.log('error', 'Error building USP legacy keys: ' + error);
		}

		return keysForm;
	},

	sendUSPLegacyKeysUpdate: function(keysForm) {
		let self = this;

		//send the web command to update all the keys that changed
		try {
			if (self.config.host_usp !== '' && self.config.host_usp !== undefined) {
				let args = {
					data: keysForm,
					headers: { "Content-Type": "application/x-www-form-urlencoded" }
				};
	
				let client = new Client();
				let req = client.post('http://' + self.config.host_usp + '/tally.htm', args, function (data, response) {
					setTimeout(self.updateCurrentlyUpdatingVariable.bind(self), self.config.advanced_config_usp_legacy_panel_delay_time, false);
				});
	
				req.on('error', function (err) {
					console.log('request error', err);
					self.log('error', 'Error updating USP legacy keys: ' + err);
				});
			}
			else {
				self.log('error', 'No USP legacy host specified, unable to update keys.');
			}
		}
		catch(error) {
			self.log('error', 'Error sending USP legacy keys update: ' + error);
		}
	},

	updateCurrentlyUpdatingVariable: function(val) {
		let self = this;

		//this is used to prevent updates from happening too quickly by telling async functions that we are currently updating the panel
		self.currentlyUpdatingLegacyPanel = val;
	},

	periodicallyUpdatePanel: function() {
		let self = this;

		//sends a panel update every 10 seconds regardless of whether or not a key has changed

		if (self.USP_LEGACY_PERIODIC_UPDATE) {
			clearInterval(self.USP_LEGACY_PERIODIC_UPDATE);
			self.USP_LEGACY_PERIODIC_UPDATE = null;
		}

		self.USP_LEGACY_PERIODIC_UPDATE = setInterval(self.queueLegacyKeyUpdate.bind(self), 10000);
	}
}