const { InstanceStatus, TCPHelper } = require('@companion-module/base');

module.exports = {
	initTCP_CompanionSatellite() {
		let self = this;

		if (self.SOCKET_COMPANION !== undefined) {
			self.SOCKET_COMPANION.destroy();
			delete self.SOCKET_COMPANION;
		}

		if (self.config.host_companion === undefined) {
			self.config.host_companion = '127.0.0.1';
		}

		if (self.config.port_companion === undefined) {
			self.config.port_companion = 16622;
		}

		if (self.config.host_companion) {
			self.log('info', `Opening Connection to Companion Satellite API: ${self.config.host_companion}:${self.config.port_companion}`);

			self.SOCKET_COMPANION = new TCPHelper(self.config.host_companion, self.config.port_companion);

			self.SOCKET_COMPANION.on('error', (err) => {
				self.log('error', 'Network error with Companion Satellite API: ' + err.message);
			})

			self.SOCKET_COMPANION.on('connect', () => {
				self.log('info', 'Connected to Companion Satellite API');
			})

			self.SOCKET_COMPANION.on('data', function (data) {	
				self.processCompanionData(data);
			});
		}
	},

	CompanionSatellite_Close() {
		let self = this;

		//close socket if it exists
		if (self.SOCKET_COMPANION !== undefined) {
			self.sendCompanionSatelliteCommand(`REMOVE-DEVICE DEVICEID=${this.DEVICE_ID}`);
			self.sendCompanionSatelliteCommand('QUIT');
			self.SOCKET_COMPANION.destroy();
			delete self.SOCKET_COMPANION;
		}
	},

	processCompanionData(data) {
		let self = this;

		try {
			let str_raw = String(data).trim();
			let str_split = str_raw.split('\n');
	
			for (let index = 0; index < str_split.length; index++) {
				let str = str_split[index];
	
				let params = str.split(' ');
				let command = params[0];
	
				// Create a satallite device on first connect
				if (command == 'BEGIN') {
					let productName = '';
					if (self.config.model == 'usp3') {
						productName = 'TSL Products USP3'
					}
					else if (self.config.model == 'usp_legacy') {
						productName = 'DNF Controls Legacy USP';
					}
					else {
						productName = 'Unknown USP Type';
					}
					self.sendCompanionSatelliteCommand(`ADD-DEVICE DEVICEID=${self.DEVICE_ID} PRODUCT_NAME="${productName}" BITMAPS=false COLORS=true TEXT=true`);
					continue;
				}
	
				// Device was added
				if (command == 'ADD-DEVICE') {
					if (params[1] == 'OK') {
						self.DATA.satelliteConnected = true;
						self.checkVariables();
						self.startCompanionSatellitePing();
					}
					else {
						//probably not ok, throw an error
						self.log('error', 'Error adding device to Companion Satellite API: ' + params[1]);
						self.DATA.satelliteConnected = false;
						self.checkVariables();
					}
					continue;
				}
	
				// Recieved a Brightness Command
				if (command == 'BRIGHTNESS') {
					//panel does not support brightness commands, but does support dim colors, so store the brightness value and use it later with color processing
					self.DATA.brightness = params[2].replace('VALUE=', '');
					continue;
				}
	
				// received a Key-State Command
				if (command == 'KEY-STATE') {
					let keyData = {
						number: 0,
						type: 'BUTTON',
						color: '',
						text: '',
						pressed: false
					};
	
					let keyNumber = parseInt(params[2].replace('KEY=', ''));
					keyData.number = 1 + keyNumber;
	
					keyData.type = params[3].replace('TYPE=', '');
					keyData.color = params[5].replace('COLOR=', '');
					keyData.text = new Buffer.from(params[6].replace('TEXT=', ''), 'base64').toString('ascii');

					//change the button text if it is not of type BUTTON
					switch(keyData.type) {
						case 'BUTTON':
							break;
						case 'PAGEUP':
							if (self.config.model == 'usp3') {
								keyData.text = '~UPARROW~';
								keyData.color = '#00FF00';
							}
							else {
								keyData.text = ' ^';
								keyData.color = '#00FF00';
							}
							break;
						case 'PAGEDOWN':
							if (self.config.model == 'usp3') {
								keyData.text = '~DNARROW~';
								keyData.color = '#00FF00';
							}
							else {
								keyData.text = ' v';
								keyData.color = '#00FF00';
							}
							break;
						case 'PAGENUM':
							keyData.text = 'Pg ' + keyData.text;
							keyData.color = '#00FF00';
							keyData.fontSize = 0;
							break;
						default:
							break;
					}
	
					keyData.pressed = params[7].replace('PRESSED=', '') == 'true' ? true : false;
	
					//determine what color it should be and align it with one of the supported color constants, and then send that color command
					let closestColor = self.getClosestUSPColor(keyData.color);
					if (closestColor && closestColor.id) {
						keyData.uspColor = closestColor.id;
					}
					else {
						keyData.uspColor = '00'; //SOLID_DARK
						closestColor = self.COLORS[0];
					}
	
					if (self.DATA.brightness <= 50) {
						//if the brightness is 50 or less, find the DIM version of this color and use that instead
						let dimColor = self.COLORS.find((color) => { return color.label == closestColor.label + '_DIM'; });
						if (dimColor) {
							keyData.uspColor = dimColor.id;
						}
					}

					if (self.config.model == 'usp3') {
							//Set the legacy color - if the color is not 1 (red), 2 (green), or 3 (amber), it is not supported on the legacy USP
							let intColor = parseInt(keyData.uspColor);
							switch (intColor) {
								case 0:
									if (self.config.advanced_usp_panel_default_dark_color !== 0) {
										keyData.uspColor = self.config.advanced_usp_panel_default_dark_color;
									}
									break;
								case 1:
								case 2:
								case 3:
								case 10:
								case 11:
								case 12:
								case 38:
								case 20:
								case 32:
								case 26:
								case 41:
								case 23:
								case 35:
								case 29:
									keyData.uspColor = intColor;
									break;
								default:
									keyData.uspColor = self.config.advanced_usp_panel_default_unsupported_color; //set to configured default color if it's outside of our range
									break;
							}
					}
					else if (self.config.model == 'usp_legacy') {
						//Set the legacy color - if the color is not 1 (red), 2 (green), or 3 (amber), it is not supported on the legacy USP
						let intColor = parseInt(keyData.uspColor);
						switch (intColor) {
							case 0:
								if (self.config.advanced_usp_panel_default_dark_color !== 0) {
									keyData.uspColorLegacy = self.config.advanced_usp_panel_default_dark_color;
								}
								break;
							case 1:
							case 2:
							case 3:
							case 10:
							case 11:
							case 12:
								keyData.uspColorLegacy = intColor;
								break;
							default:
								keyData.uspColorLegacy = self.config.advanced_usp_panel_default_unsupported_color; //set to configured default color if it's outside of our range
								break;
						}
					}

					// Render Button Text
					let keyText = keyData.text
	
					//make sure the font size is configured
					if (self.config.font_size === undefined) {
						self.config.font_size = 0;
					}
	
					let fontSize = self.config.font_size;
	
					// Check if there is a title/text on the button?
					if (keyText.length > 0) {				
						// If the text includes a line break, replace it with a space
						if (keyText.includes('\\n')) {
							keyText = keyText.split("\\n").join(" ")
						}
						
						//if the text includes a _, remove it because this interferes with the protocol, replace it with a space
						if (keyText.includes('_')) {
							keyText = keyText.split("_").join(" ")
						}
					}
					else {
						keyText = '  ';
					}

					keyData.text = keyText;

					if (keyData.fontSize == undefined) { //if the font size is not already set, determine a size
						//now check the number of characters in the text, and if it is too long, adjust the font size and lines (as long as the user has not set the font size manually)
						if (fontSize == 'auto') {
							if (keyText.length < 4) {
								fontSize = 2;
							}
							else if (keyText.length < 8) {
								fontSize = 1;
							}
							else {
								fontSize = 0;
							}
						}

						keyData.fontSize = fontSize;
					}

					//pad with 0 if needed
					keyData.uspColor = String(keyData.uspColor).padStart(2, '0');
					
					if (self.config.model == 'usp3') {
						if (keyData.number <= 16) { //no need to send anything higher than 16
							self.sendUSPCommand(`COL_${String(keyData.number).padStart(2, '0')}:${keyData.uspColor}`);
                            self.sendUSPCommand(`TXT_${String(keyData.number).padStart(2, '0')}:${fontSize}_${keyText}`);
						}
						self.updateInternalKey(keyData);
					}
					else if (self.config.model == 'usp_legacy') {
						self.updateLegacyKeys(keyData);
					}
					continue;
				}
			}
		}
		catch(error) {
			self.log('error', 'Error processing Companion Satellite API data: ' + error.toString());
			console.log(error)
		}
	},

	updateInternalKey(keyData) {
		let self = this;

		if (self.config.verbose) {
			self.log('debug', `Updating key ${keyData.number}: ${keyData.text} ${keyData.color} pressed: ${keyData.pressed}`);
		}

		//store the updated key data
		let foundKey = false;
		for (let i = 0; i < self.DATA.keys.length; i++) {
			if (self.DATA.keys[i].number == keyData.number) {
				self.DATA.keys[i] = keyData;
				break;
			}
		}

		if (!foundKey) {
			self.DATA.keys.push(keyData);
		}
	},

	startCompanionSatellitePing() {
		let self = this;

		self.COMPANION_PING_INTERVAL = setInterval(function () {
			self.sendCompanionSatelliteCommand('PING');
		}, 100);
	},

	sendCompanionSatelliteCommand(cmd) {
		let self = this;

		if (self.SOCKET_COMPANION !== undefined && self.SOCKET_COMPANION.isConnected) {
			if (self.config.verbose) {
				if (cmd !== 'PING') {
					self.log('debug', 'Sending Companion Satellite API Command: ' + cmd);
				}
			}
			self.SOCKET_COMPANION.send(cmd + '\n');
		}
	},
}