const { InstanceBase, InstanceStatus, runEntrypoint } = require('@companion-module/base');
const UpgradeScripts = require('./src/upgrades');

const config = require('./src/config');
const actions = require('./src/actions');
const feedbacks = require('./src/feedbacks');
const variables = require('./src/variables');
const presets = require('./src/presets');

const utils = require('./src/utils');
const usp = require('./src/usp');
const usp_legacy = require('./src/usp_legacy');

const constants = require('./src/constants');

class uspInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		// Assign the methods from the listed files to this class
		Object.assign(this, {
			...config,
			...actions,
			...feedbacks,
			...variables,
			...presets,
			...utils,
			...usp,
			...usp_legacy,
			...constants
		})

		this.SOCKET_COMPANION = undefined; //socket for Companion Satellite API
		this.SOCKET_USP = undefined; //socket for USP3 panel

		this.USP_LEGACY_SNMP_AGENT = undefined; //SNMP agent for legacy USP panels

		this.COMPANION_PING_INTERVAL = undefined; //used to ping Companion Satellite API every 100ms

		this.USP_INTERVAL = undefined; //used to request data from USP3 panel periodically

		this.USP_LEGACY_PERIODIC_UPDATE = undefined; //used to update the USP legacy panel periodically

		this.DATA = {
			satelliteConnected: false, //used to track if we are connected to the Companion Satellite API
			uspConnected: false, //used to track if we are connected to the USP panel
			keys: [], //key definitions from Companion Satellite surface
			gpiStates: [ //GPI states from USP3 panel
				{ id: '01', state: false },
				{ id: '02', state: false },
				{ id: '03', state: false },
				{ id: '04', state: false },
				{ id: '05', state: false },
				{ id: '06', state: false },
				{ id: '07', state: false },
				{ id: '08', state: false },
				{ id: '09', state: false },
				{ id: '10', state: false },
				{ id: '11', state: false },
				{ id: '12', state: false },
				{ id: '13', state: false },
				{ id: '14', state: false },
				{ id: '15', state: false },
				{ id: '16', state: false }
			],
			gpoStates: [ //GPO states from USP3 panel
				{ id: '01', state: false },
				{ id: '02', state: false },
				{ id: '03', state: false },
				{ id: '04', state: false },
				{ id: '05', state: false },
				{ id: '06', state: false },
				{ id: '07', state: false },
				{ id: '08', state: false },
				{ id: '09', state: false },
				{ id: '10', state: false },
				{ id: '11', state: false },
				{ id: '12', state: false },
				{ id: '13', state: false },
				{ id: '14', state: false },
				{ id: '15', state: false },
				{ id: '16', state: false }
			],
			memStates: [ //mem states from USP3 panel
				{ id: '01', state: false },
				{ id: '02', state: false },
				{ id: '03', state: false },
				{ id: '04', state: false },
				{ id: '05', state: false },
				{ id: '06', state: false },
				{ id: '07', state: false },
				{ id: '08', state: false },
				{ id: '09', state: false },
				{ id: '10', state: false },
				{ id: '11', state: false },
				{ id: '12', state: false },
				{ id: '13', state: false },
				{ id: '14', state: false },
				{ id: '15', state: false },
				{ id: '16', state: false }
			],
			keyStates: [ //key states from USP3 panel
				{ id: '01', state: false },
				{ id: '02', state: false },
				{ id: '03', state: false },
				{ id: '04', state: false },
				{ id: '05', state: false },
				{ id: '06', state: false },
				{ id: '07', state: false },
				{ id: '08', state: false },
				{ id: '09', state: false },
				{ id: '10', state: false },
				{ id: '11', state: false },
				{ id: '12', state: false },
				{ id: '13', state: false },
				{ id: '14', state: false },
				{ id: '15', state: false },
				{ id: '16', state: false }
			],
		};

		this.DEVICE_ID = this.id; //device ID for Companion Satellite API

		this.currentlyUpdatingLegacyPanel = false; //used to track if we are currently updating the USP legacy panel
		this.legacy_key_interval  = null; //used to track the interval for updating the USP legacy panel
	}

	async destroy() {
		if (this.SOCKET_COMPANION !== undefined) {
			this.sendCompanionSatelliteCommand('QUIT');
			this.SOCKET_COMPANION.destroy();
			delete this.SOCKET_COMPANION;
		}

		if (this.SOCKET_USP !== undefined) {
			this.SOCKET_USP.destroy();
			delete this.SOCKET_USP;
		}

		if (this.COMPANION_PING_INTERVAL !== undefined) {
			clearInterval(this.COMPANION_PING_INTERVAL);
			delete this.COMPANION_PING_INTERVAL;
		}

		if (this.USP_INTERVAL !== undefined) {
			clearInterval(this.USP_INTERVAL);
			delete this.USP_INTERVAL;
		}

		if (this.USP_LEGACY_PERIODIC_UPDATE !== undefined) {
			clearInterval(this.USP_LEGACY_PERIODIC_UPDATE);
			delete this.USP_LEGACY_PERIODIC_UPDATE;
		}
	}

	async init(config) {
		this.configUpdated(config);
	}

	async configUpdated(config) {
		// polling is running and polling has been de-selected by config change
		if (this.USP_INTERVAL !== undefined) {
			clearInterval(this.USP_INTERVAL);
			delete this.USP_INTERVAL;
		}
		this.config = config;

		this.updateStatus(InstanceStatus.Connecting, 'Connecting to panel...');
		
		this.initActions();
		this.initFeedbacks();
		this.initVariables();
		this.initPresets();

		this.checkVariables();
		this.checkFeedbacks();

		if (this.config.use_as_surface == true) {
			this.CompanionSatellite_Close(); //close the Companion Satellite API if it is open
		}

		if (this.config.model === 'usp3') {
			this.initUSP();
		}
		else if (this.config.model == 'usp_legacy') {
			this.initCompanionSatellite();
			this.initUSP_Legacy();
		}
	}
}

runEntrypoint(uspInstance, UpgradeScripts);