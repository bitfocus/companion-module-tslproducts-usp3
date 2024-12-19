const { InstanceStatus, TCPHelper } = require('@companion-module/base')

const Client = require('node-rest-client').Client

module.exports = {
	getClosestUSPColor(color) {
		//gets the closet compatible color from the supported colors list
		let self = this

		function hexToRgb(hex) {
			let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
			hex = hex.replace(shorthandRegex, function (m, r, g, b) {
				return r + r + g + g + b + b
			})

			let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
			return result
				? {
						r: parseInt(result[1], 16),
						g: parseInt(result[2], 16),
						b: parseInt(result[3], 16),
					}
				: null
		}

		// Distance between 2 colors (in RGB)
		function distance(a, b) {
			return Math.sqrt(Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2))
		}

		// return nearest color from array
		function nearestColor(colorHex) {
			let lowest = Number.POSITIVE_INFINITY
			let tmp
			let index = 0
			self.COLORS.forEach((el, i) => {
				if (el.hex !== undefined) {
					tmp = distance(hexToRgb(colorHex), hexToRgb(el.hex))
					if (tmp < lowest) {
						lowest = tmp
						index = i
					}
				}
			})
			return self.COLORS[index]
		}

		return nearestColor(color)
	},

	initUSP() {
		let self = this

		if (self.config.host_usp !== '') {
			if (
				(self.config.auto_configure == true && self.config.already_configured !== true) ||
				self.config.rerun_configuration == true
			) {
				self.autoConfigurePanel()
			} else {
				self.log('info', 'USP3 panel already configured, skipping auto-configuration.')
				self.initUSP_Connection()
			}
		}
	},

	autoConfigurePanel: async function () {
		//will attempt to hack web UI to send the panel config we need to make this work as a satellite surface
		let self = this

		self.log('info', 'Attempting to auto-configure USP3 panel...')

		let companionIP = ''

		try {
			//first, we will need Companion's IP that is on the same subnet as the panel's IP, so let's look at all the bound IPs and see if we can find one that is on the same subnet as the panel
			let panelIP = self.config.host_usp
			let panelIPParts = panelIP.split('.')
			let panelSubnet = panelIPParts[0] + '.' + panelIPParts[1] + '.' + panelIPParts[2] + '.'

			let interfaces = await self.parseVariablesInString('$(internal:all_ip)')
			let interfacesArr = interfaces.split('\\n')
			for (let i = 0; i < interfacesArr.length; i++) {
				let interfaceIP = interfacesArr[i]
				if (interfaceIP.startsWith(panelSubnet)) {
					companionIP = interfaceIP
					break
				}
			}

			if (companionIP == '') {
				//lets just pick the first IP that is not 0.0.0.0 or 127.0.0.1
				for (let i = 0; i < interfacesArr.length; i++) {
					let interfaceIP = interfacesArr[i]
					if (interfaceIP.startsWith('0.0.0') == false && interfaceIP.startsWith('127.0.0') == false) {
						companionIP = interfaceIP
						break
					}
				}

				if (companionIP == '') {
					self.log(
						'error',
						'Could not find a suitable IP for Companion to use as a satellite surface. Turn off Auto-Configure and manually configure the panel.'
					)
					self.updateStatus(InstanceStatus.ConnectionFailure)
					return
				} else {
					self.log('info', 'Using IP ' + companionIP + ' for Companion while auto configuring the panel.')
				}
			}
		} catch (error) {
			self.log('error', 'Error finding network interfaces: ' + error)
			self.updateStatus(InstanceStatus.Error)
			return
		}

		self.log('info', 'Configuring Remote Device Assignment Page...')

		try {
			let deviceFormData = ''
			deviceFormData += `r${self.config.usp_device_id}c0=Bitfocus+Companion` //device name
			deviceFormData += `&r${self.config.usp_device_id}c1=14` //device type
			deviceFormData += `&r${self.config.usp_device_id}c5=${companionIP}` //companion IP
			deviceFormData += `&r${self.config.usp_device_id}c7=4` //heartbeat rate of 5 seconds

			let args = {
				data: deviceFormData,
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			}

			let client = new Client()
			let req = client.post('http://' + self.config.host_usp + '/rd_list.htm', args, function (data, response) {
				self.log(
					'info',
					'Remote Device Assignment Page configured successfully! Now configuring Tally Assignment Page...'
				)
				//then we will set up the Tally Assignment, and make all switches of type Remote USP and assigned to our Companion device
				self.autoConfigurePanelSwitches.bind(self)()
			})

			req.on('error', function (err) {
				self.log('error', 'Error auto configuring USP3 panel: ' + err)
			})
		} catch (error) {
			self.log('error', 'Error configuring Remote Device Assignment Page: ' + error)
			self.updateStatus(InstanceStatus.Error)
			return
		}
	},

	autoConfigurePanelSwitches: function () {
		let self = this

		self.log('info', 'Configuring Tally Assignment Page...')

		try {
			let switchFormData = ''

			for (let i = 0; i < 16; i++) {
				if (switchFormData !== '') {
					switchFormData += '&'
				}

				switchFormData += `r${i * 5}c1=2` //tally source
				switchFormData += '&'
				switchFormData += `r${i * 5}c2=12` //tally type - follow usp3 api
				switchFormData += '&'
				switchFormData += `r${i * 5}c4=0` //tally color = dark
			}

			let args = {
				data: switchFormData,
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			}

			let client = new Client()
			let req = client.post('http://' + self.config.host_usp + '/tally.htm', args, function (data, response) {
				self.config.already_configured = true
				self.saveConfig(self.config)

				self.log('info', 'USP3 panel auto-configured successfully!')

				self.initUSP_Connection()
			})

			req.on('error', function (err) {
				self.log('error', 'Error auto configuring USP panel: ' + err)
			})
		} catch (error) {
			self.log('error', 'Error configuring Tally Assignment Page: ' + error)
			self.updateStatus(InstanceStatus.Error)
			return
		}
	},

	initUSP_Connection() {
		let self = this

		try {
			if (self.SOCKET_USP !== undefined) {
				self.SOCKET_USP.destroy()
				delete self.SOCKET_USP
			}

			if (self.config.port_usp === undefined) {
				self.config.port_usp = 50001
			}

			if (self.config.host_usp) {
				self.log('info', `Opening Connection to USP3: ${self.config.host_usp}:${self.config.port_usp}`)

				self.SOCKET_USP = new TCPHelper(self.config.host_usp, self.config.port_usp)

				self.SOCKET_USP.on('error', (err) => {
					self.log('error', 'Network error with USP3: ' + err.message)
					self.updateStatus(InstanceStatus.ConnectionFailure)
					clearInterval(self.USP_INTERVAL)
					self.SOCKET_USP.destroy()
					self.SOCKET_USP == undefined
					self.DATA.uspConnected = false
					self.checkVariables()

					self.log('warn', 'Connection lost. Attempting to reconnect to USP3 in 5 seconds...')
					//try again in 5 seconds
					setTimeout(() => {
						self.updateStatus(InstanceStatus.Connecting, 'Attempting to Reconnect to Panel...')
						self.log('info', `Attempting to reconnect to USP3.`)
						self.initUSP_Connection()
					}, 5000)
				})

				self.SOCKET_USP.on('connect', () => {
					self.log('info', `Connected to USP3 Panel at ${self.config.host_usp}:${self.config.port_usp}`)
					self.getUSPInformation()
					self.initUSPPolling()

					if (self.config.use_as_surface == true) {
						this.initCompanionSatellite()
					}

					self.updateStatus(InstanceStatus.Ok)
					self.DATA.uspConnected = true
					self.checkVariables()
				})

				self.SOCKET_USP.on('data', (receivebuffer) => {
					let data = receivebuffer.toString('utf8')
					self.processUSPData(data)
				})

				self.SOCKET_USP.on('close', () => {
					self.updateStatus(InstanceStatus.Warning, 'Connection to USP3 lost')
					self.DATA.uspConnected = false
					self.checkVariables()
					clearInterval(self.USP_INTERVAL)

					//try again in 5 seconds
					setTimeout(() => {
						self.initUSP_Connection()
					}, 5000)
				})
			}
		} catch (error) {
			self.log('error', 'Error opening connection to USP3: ' + error)
			self.updateStatus(InstanceStatus.Error)
		}
	},

	processUSPData(data) {
		//process the data received from the USP3 panel
		let self = this

		self.log('debug', 'Received TCP Data from USP3: ' + data)

		try {
			let lines = data.split('\n')
			for (let i = 0; i < lines.length; i++) {
				if (lines[i].indexOf(',') > -1) {
					//a multi response like multiple key data
					let responses = lines[i].split(',')
					for (let j = 0; j < responses.length; j++) {
						if (responses[j].indexOf('COL') > -1) {
							self.processUSP_COLData(responses[j])
						} else if (responses[j].indexOf('KEY') > -1 || responses[j].indexOf('KYP') > -1) {
							self.processUSP_KeyData(responses[j])
						} else if (responses[j].indexOf('GPI') > -1) {
							self.processUSP_GPIData(responses[j])
						} else if (responses[j].indexOf('GPO') > -1) {
							self.processUSP_GPOData(responses[j])
						} else if (responses[j].indexOf('MEM') > -1) {
							self.processUSP_MEMData(responses[j])
						} else {
							console.log('Unknown USP3 response: ' + responses[j])
						}
					}
				} else {
					if (lines[i].indexOf('COL') > -1) {
						self.processUSP_COLData(lines[i])
					} else if (lines[i].indexOf('KEY') > -1 || lines[i].indexOf('KYP') > -1) {
						self.processUSP_KeyData(lines[i])
					} else if (lines[i].indexOf('GPI') > -1) {
						self.processUSP_GPIData(lines[i])
					} else if (lines[i].indexOf('GPO') > -1) {
						self.processUSP_GPOData(lines[i])
					} else if (lines[i].indexOf('MEM') > -1) {
						self.processUSP_MEMData(lines[i])
					}
				}
			}
		} catch (error) {
			self.log('error', 'Error processing USP3 data: ' + error.toString())
		}
	},

	processUSP_COLData(data) {
		let self = this

		if (data.indexOf('ACK') > -1) {
			return
		} else if (data.indexOf('NAK') > -1) {
			//error with color change of some kind, but this would probably never happen
			return
		}
	},

	processUSP_KeyData(data) {
		let self = this

		if (data.indexOf('ACK') > -1) {
			return
		} else if (data.indexOf('NAK') > -1) {
			//error with Key press of some kind, but this would probably never happen
			return
		} else {
			try {
				let keyNumber = data.substring(data.indexOf('_') + 1, data.lastIndexOf(':'))

				let keyState = data[data.length - 1] == '1' ? true : false

				let keyObj = {
					id: keyNumber,
					state: keyState,
				}

				//check to see if this key state is already in the array, and if it is, update it, otherwise add it
				let found = false
				let keyChanged = true //assume it changed until we find out otherwise

				for (let i = 0; i < self.DATA.keyStates.length; i++) {
					if (self.DATA.keyStates[i].id == keyNumber) {
						if (self.DATA.keyStates[i].state == keyState) {
							keyChanged = false
						}

						self.DATA.keyStates[i].state = keyState
						found = true
						break
					}
				}

				if (!found) {
					self.DATA.keyStates.push(keyObj)
				}

				if (self.config.use_as_surface) {
					//send the key press to the companion satellite
					if (keyChanged) {
						//only send if the key state changed
						keyNumber = parseInt(keyNumber) - 1 //zero based
						self.sendCompanionSatelliteCommand(
							`KEY-PRESS DEVICEID=${self.DEVICE_ID} KEY=${keyNumber} PRESSED=${keyState}`
						)
					}
				}

				self.checkVariables()
				self.checkFeedbacks()
			} catch (error) {
				self.log('error', 'Error processing USP3 Key Data: ' + error)
			}
		}
	},

	processUSP_GPIData(data) {
		let self = this

		if (data.indexOf('ACK') > -1) {
			return
		} else if (data.indexOf('NAK') > -1) {
			//error with GPI of some kind, but this would probably never happen
			return
		} else {
			try {
				let gpiNumber = data.substring(data.indexOf('_') + 1, data.lastIndexOf(':'))

				let gpiState = data[data.length - 1] == '1' ? true : false

				let gpiObj = {
					id: gpiNumber,
					state: gpiState,
				}

				//check to see if this gpi state is already in the array, and if it is, update it, otherwise add it
				let found = false
				for (let i = 0; i < self.DATA.gpiStates.length; i++) {
					if (self.DATA.gpiStates[i].id == gpiNumber) {
						self.DATA.gpiStates[i].state = gpiState
						found = true
						break
					}
				}

				if (!found) {
					self.DATA.gpiStates.push(gpiObj)
				}

				self.checkVariables()
				self.checkFeedbacks()
			} catch (error) {
				self.log('error', 'Error processing USP3 GPI Data: ' + error)
			}
		}
	},

	processUSP_GPOData(data) {
		let self = this

		if (data.indexOf('ACK') > -1) {
			return
		} else if (data.indexOf('NAK') > -1) {
			//error with GPO of some kind
			self.log('error', 'Error setting GPO state.')
			return
		} else {
			try {
				let gpoNumber = data.substring(data.indexOf('_') + 1, data.lastIndexOf(':'))

				let gpoState = data[data.length - 1] == '1' ? true : false

				let gpoObj = {
					id: gpoNumber,
					state: gpoState,
				}

				//check to see if this gpo state is already in the array, and if it is, update it, otherwise add it
				let found = false
				for (let i = 0; i < self.DATA.gpoStates.length; i++) {
					if (self.DATA.gpoStates[i].id == gpoNumber) {
						self.DATA.gpoStates[i].state = gpoState
						found = true
						break
					}
				}

				if (!found) {
					self.DATA.gpoStates.push(gpoObj)
				}

				self.checkVariables()
				self.checkFeedbacks()
			} catch (error) {
				self.log('error', 'Error processing USP3 GPO Data: ' + error)
			}
		}
	},

	processUSP_MEMData(data) {
		let self = this

		if (data.indexOf('ACK') > -1) {
			return
		} else if (data.indexOf('NAK') > -1) {
			//error with MEM of some kind, but this would probably never happen
			return
		} else {
			try {
				let memNumber = data.substring(data.indexOf('_') + 1, data.lastIndexOf(':'))

				let memState = data[data.length - 1] == '1' ? true : false

				let memObj = {
					id: memNumber,
					state: memState,
				}

				//check to see if this memory state is already in the array, and if it is, update it, otherwise add it
				let found = false
				for (let i = 0; i < self.DATA.memStates.length; i++) {
					if (self.DATA.memStates[i].id == memNumber) {
						self.DATA.memStates[i].state = memState
						found = true
						break
					}
				}

				if (!found) {
					self.DATA.memStates.push(memObj)
				}

				self.checkVariables()
				self.checkFeedbacks()
			} catch (error) {
				self.log('error', 'Error processing USP3 MEM Data: ' + error)
			}
		}
	},

	sendUSPCommand(cmd) {
		let self = this

		try {
			if (
				self.config.host_usp !== undefined &&
				self.config.host_usp !== '' &&
				self.config.port_usp !== undefined &&
				self.config.port_usp !== ''
			) {
				if (self.SOCKET_USP !== undefined && self.SOCKET_USP.isConnected) {
					if (self.config.verbose) {
						self.log('debug', 'Sending Command to USP3: ' + cmd)
					}

					self.SOCKET_USP.send(Buffer.from(cmd + '\n'))
				} else {
					if (self.config.verbose) {
						self.log('debug', 'TCP Socket to USP3 not open.')
					}
				}
			}
		} catch (error) {
			self.log('error', 'Error sending command to USP3: ' + error)
		}
	},

	getUSPInformation() {
		let self = this

		if (self.SOCKET_USP.isConnected) {
			self.sendUSPCommand('KEY?') //get key states
			self.sendUSPCommand('GPI?') //get gpi states
			self.sendUSPCommand('GPS?') //get gpo states
		}
	},

	initUSPPolling() {
		let self = this

		if (self.USP_INTERVAL !== undefined) {
			clearInterval(self.USP_INTERVAL)
			delete self.USP_INTERVAL
		}

		if (self.config.polling || self.config.use_as_surface == true) {
			//if we are using this as a surface, we need to poll or the panel will think it is disconnected
			self.config.poll_interval = 5000
			self.USP_INTERVAL = setInterval(() => {
				self.getUSPInformation()
			}, self.config.poll_interval)
		}
	},
}
