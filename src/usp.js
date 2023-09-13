const { InstanceStatus, TCPHelper } = require('@companion-module/base');

module.exports = {
	getClosestUSPColor(color) {
		let self = this;

		function hexToRgb(hex) {
			let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
			hex = hex.replace(shorthandRegex, function(m, r, g, b) {
				return r + r + g + g + b + b;
			});
		
			let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
			return result ? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16)
			} : null;
		}
		
		// Distance between 2 colors (in RGB)
		function distance(a, b) {
			return Math.sqrt(Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2));
		}
		
		// return nearest color from array
		function nearestColor(colorHex){
			let lowest = Number.POSITIVE_INFINITY;
			let tmp;
			let index = 0;
			self.COLORS.forEach( (el, i) => {
				if (el.hex !== undefined) {
					tmp = distance(hexToRgb(colorHex), hexToRgb(el.hex))
					if (tmp < lowest) {
						lowest = tmp;
						index = i;
					};
				}
			})
			return self.COLORS[index];
		}
		
		return nearestColor(color);
	},

	initTCP_USP() {
		let self = this;

		if (self.SOCKET_USP !== undefined) {
			self.SOCKET_USP.destroy()
			delete self.SOCKET_USP;
		}

		if (self.config.port_usp === undefined) {
			self.config.port_usp = 50001;
		}

		if (self.config.host_usp) {
			self.log('info', `Opening Connection to USP3: ${self.config.host_usp}:${self.config.port_usp}`);

			self.SOCKET_USP = new TCPHelper(self.config.host_usp, self.config.port_usp);

			self.SOCKET_USP.on('error', (err) => {
				self.log('error', 'Network error with USP3: ' + err.message);
				self.updateStatus(InstanceStatus.ConnectionFailure);
				clearInterval(self.USP_INTERVAL);
				self.SOCKET_USP.destroy();
				self.SOCKET_USP == undefined;
				self.DATA.uspConnected = false;
				self.checkVariables();
			});

			self.SOCKET_USP.on('connect', () => {
				self.getUSPInformation();
				self.initUSPPolling();

				self.updateStatus(InstanceStatus.Ok);
				self.DATA.uspConnected = true;
				self.checkVariables();
			});

			self.SOCKET_USP.on('data', (receivebuffer) => {
				let data = receivebuffer.toString('utf8');
				self.processUSPData(data);
			});

			self.SOCKET_USP.on('close', () => {
				self.updateStatus(InstanceStatus.Warning, 'Connection to USP3 lost');
				self.DATA.uspConnected = false;
				self.checkVariables();
				clearInterval(self.USP_INTERVAL);
			});
		}
	},

	processUSPData(data) {
		let self = this;

		try {
			let lines = data.split('\n');
			for (let i = 0; i < lines.length; i++) {
				if (lines[i].indexOf(',') > -1) {
					//a multi response like multiple key data
					let responses = lines[i].split(',');
					for (let j = 0; j < responses.length; j++) {
						if (responses[j].indexOf('COL') > -1) {
							self.processUSP_COLData(responses[j]);
						}
						else if (responses[j].indexOf('KEY') > -1 || responses[j].indexOf('KYP') > -1) {
							self.processUSP_KeyData(responses[j]);
						}
						else if (responses[j].indexOf('GPI') > -1) {
							self.processUSP_GPIData(responses[j]);
						}
						else if (responses[j].indexOf('GPO') > -1) {
							self.processUSP_GPOData(responses[j]);
						}
						else if (responses[j].indexOf('MEM') > -1) {
							self.processUSP_MEMData(responses[j]);
						}
					}
				}
				else {
					if (lines[i].indexOf('COL') > -1) {
						self.processUSP_COLData(lines[i]);
					}
					else if (lines[i].indexOf('KEY') > -1 || lines[i].indexOf('KYP') > -1) {
						self.processUSP_KeyData(lines[i]);
					}
					else if (lines[i].indexOf('GPI') > -1) {
						self.processUSP_GPIData(lines[i]);
					}
					else if (lines[i].indexOf('GPO') > -1) {
						self.processUSP_GPOData(lines[i]);
					}
					else if (lines[i].indexOf('MEM') > -1) {
						self.processUSP_MEMData(lines[i]);
					}
				}
			}
		}
		catch(error) {
			self.log('error', 'Error processing USP3 data: ' + error.toString());
		}
	},

	processUSP_COLData(data) {
		let self = this;

		if (data.indexOf('ACK') > -1) {
			return;
		}
		else if (data.indexOf('NAK') > -1) {
			//error with color change of some kind, but this would probably never happen
		}
	},

	processUSP_KeyData(data) {
		let self = this;

		if (data.indexOf('ACK') > -1) {
			return;
		}
		else if (data.indexOf('NAK') > -1) {
			//error with Key press of some kind, but this would probably never happen
		}
		else {
			let keyNumber = data.substring(
				data.indexOf("_") + 1,
				data.lastIndexOf(":")
			);
	
			let keyState = (data[data.length - 1]) == '1' ? true : false;
	
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

			if (self.config.use_as_surface) {
				keyNumber = parseInt(keyNumber) - 1; //zero based		
				self.sendCompanionSatelliteCommand(`KEY-PRESS DEVICEID=${self.DEVICE_ID} KEY=${keyNumber} PRESSED=${keyState}`);
			}

			self.checkVariables();
			self.checkFeedbacks();
		}
	},

	processUSP_GPIData(data) {
		let self = this;

		if (data.indexOf('ACK') > -1) {
			return;
		}
		else if (data.indexOf('NAK') > -1) {
			//error with GPI of some kind, but this would probably never happen
		}
		else {
			let gpiNumber = data.substring(
				data.indexOf("_") + 1,
				data.lastIndexOf(":")
			);
	
			let gpiState = (data.length - 1) == '1' ? true : false;
	
			let gpiObj = {
				id: gpiNumber,
				state: gpiState
			};
	
			//check to see if this gpi state is already in the array, and if it is, update it, otherwise add it
			let found = false;
			for (let i = 0; i < self.DATA.gpiStates.length; i++) {
				if (self.DATA.gpiStates[i].id == gpiNumber) {
					self.DATA.gpiStates[i].state = gpiState;
					found = true;
					break;
				}
			}

			if (!found) {
				self.DATA.gpiStates.push(gpiObj);
			}

			self.checkVariables();
			self.checkFeedbacks();
		}
	},

	processUSP_GPOData(data) {
		let self = this;

		if (data.indexOf('ACK') > -1) {
			return;
		}
		else if (data.indexOf('NAK') > -1) {
			//error with GPO of some kind
			self.log('error', 'Error setting GPO state.');
			return;
		}
		else {
			let gpoNumber = data.substring(
				data.indexOf("_") + 1,
				data.lastIndexOf(":")
			);

			let gpoState = (data.length - 1) == '1' ? true : false;

			let gpoObj = {
				id: gpoNumber,
				state: gpoState
			};

			//check to see if this gpo state is already in the array, and if it is, update it, otherwise add it
			let found = false;
			for (let i = 0; i < self.DATA.gpoStates.length; i++) {
				if (self.DATA.gpoStates[i].id == gpoNumber) {
					self.DATA.gpoStates[i].state = gpoState;
					found = true;
					break;
				}
			}

			if (!found) {
				self.DATA.gpoStates.push(gpoObj);
			}

			self.checkVariables();
			self.checkFeedbacks();
		}
	},

	processUSP_MEMData(data) {
		let self = this;

		if (data.indexOf('ACK') > -1) {
			return;
		}
		else if (data.indexOf('NAK') > -1) {
			//error with MEM of some kind
		}
		else {
			let memNumber = data.substring(
				data.indexOf("_") + 1,
				data.lastIndexOf(":")
			);

			let memState = (data.length - 1) == '1' ? true : false;

			let memObj = {
				id: memNumber,
				state: memState
			};

			//check to see if this memory state is already in the array, and if it is, update it, otherwise add it
			let found = false;
			for (let i = 0; i < self.DATA.memStates.length; i++) {
				if (self.DATA.memStates[i].id == memNumber) {
					self.DATA.memStates[i].state = memState;
					found = true;
					break;
				}
			}

			if (!found) {
				self.DATA.memStates.push(memObj);
			}

			self.checkVariables();
			self.checkFeedbacks();
		}
	},

	sendUSPCommand(cmd) {
		let self = this;

		if (self.config.host_usp !== undefined && self.config.host_usp !== '' && self.config.port_usp !== undefined && self.config.port_usp !== '') {
			if (self.SOCKET_USP !== undefined && self.SOCKET_USP.isConnected) {
				if (self.config.verbose) {
					self.log('debug', 'Sending TCP Command to USP3: ' + cmd);
				}

				self.SOCKET_USP.send(Buffer.from(cmd + '\n'));
			}
			else {
				if (self.config.verbose) {
					self.log('debug', 'TCP Socket to USP3 not open.');
				}
			}
		}
	},

	getUSPInformation() {
		let self = this;

		if (self.SOCKET_USP.isConnected) {
			self.sendUSPCommand('KEY?'); //get key states
			self.sendUSPCommand('GPI?'); //get gpi states
			self.sendUSPCommand('GPS?'); //get gpo states - this might actually be GPO? but the manual says GPS?
		}
	},

	initUSPPolling() {
		let self = this;

		if (self.USP_INTERVAL !== undefined) {
			clearInterval(self.USP_INTERVAL);
			delete self.USP_INTERVAL;
		}

		if (self.config.polling) {
			self.USP_INTERVAL = setInterval(() => {
				self.getUSPInformation();
			}, self.config.poll_interval);
		}
	}
}