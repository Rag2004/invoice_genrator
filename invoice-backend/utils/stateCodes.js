// State codes from https://docs.ewaybillgst.gov.in/apidocs/state-code.html
const STATE_CODES = {
    'Jammu and Kashmir': '01',
    'Himachal Pradesh': '02',
    'Punjab': '03',
    'Chandigarh': '04',
    'Uttarakhand': '05',
    'Haryana': '06',
    'Delhi': '07',
    'Rajasthan': '08',
    'Uttar Pradesh': '09',
    'Bihar': '10',
    'Sikkim': '11',
    'Arunachal Pradesh': '12',
    'Nagaland': '13',
    'Manipur': '14',
    'Mizoram': '15',
    'Tripura': '16',
    'Meghalaya': '17',
    'Assam': '18',
    'West Bengal': '19',
    'Jharkhand': '20',
    'Odisha': '21',
    'Chattisgarh': '22',
    'Madhya Pradesh': '23',
    'Gujarat': '24',
    'Daman and Diu': '25',
    'Dadra and Nagar Haveli': '26',
    'Maharashtra': '27',
    'Andhra Pradesh (Before Division)': '28',
    'Karnataka': '29',
    'Goa': '30',
    'Lakshadweep': '31',
    'Kerala': '32',
    'Tamil Nadu': '33',
    'Puducherry': '34',
    'Andaman and Nicobar Islands': '35',
    'Telangana': '36',
    'Andhra Pradesh': '37',
    'Ladakh': '38'
};

/**
 * Get state code from state name
 * @param {string} stateName - Name of the state
 * @returns {string} - State code (e.g., '07' for Delhi)
 */
function getStateCode(stateName) {
    if (!stateName) return '';

    // Try exact match first
    if (STATE_CODES[stateName]) {
        return STATE_CODES[stateName];
    }

    // Try case-insensitive match
    const normalizedStateName = stateName.trim();
    const matchedKey = Object.keys(STATE_CODES).find(
        key => key.toLowerCase() === normalizedStateName.toLowerCase()
    );

    return matchedKey ? STATE_CODES[matchedKey] : '';
}

/**
 * Get formatted state name with code (e.g., "Delhi (07)")
 * @param {string} stateName - Name of the state
 * @returns {string} - Formatted state name with code
 */
function getStateWithCode(stateName) {
    if (!stateName) return '';

    const code = getStateCode(stateName);
    return code ? `${stateName} (${code})` : stateName;
}

/**
 * Get state name from state code (reverse lookup)
 * @param {string} stateCode - State code (e.g., '07', '27')
 * @returns {string} - State name (e.g., 'Delhi')
 */
function getStateNameFromCode(stateCode) {
    if (!stateCode) return '';

    const normalizedCode = stateCode.toString().padStart(2, '0');
    const matchedState = Object.entries(STATE_CODES).find(
        ([_, code]) => code === normalizedCode
    );

    return matchedState ? matchedState[0] : '';
}

/**
 * Extract state code and name from GSTIN
 * GSTIN Format: First 2 digits = State Code
 * Example: "27AAAAA0000A1Z5" -> Maharashtra (27)
 * 
 * @param {string} gstin - GSTIN number
 * @returns {object} - { stateCode: '27', stateName: 'Maharashtra', formatted: 'Maharashtra (27)' }
 */
function getStateFromGSTIN(gstin) {
    if (!gstin || typeof gstin !== 'string' || gstin.length < 2) {
        return { stateCode: '', stateName: '', formatted: '' };
    }

    // Extract first 2 digits from GSTIN
    const stateCode = gstin.substring(0, 2);

    // Validate it's numeric
    if (!/^\d{2}$/.test(stateCode)) {
        return { stateCode: '', stateName: '', formatted: '' };
    }

    // Get state name from code
    const stateName = getStateNameFromCode(stateCode);
    const formatted = stateName ? `${stateName} (${stateCode})` : '';

    return {
        stateCode,
        stateName,
        formatted
    };
}

module.exports = {
    STATE_CODES,
    getStateCode,
    getStateWithCode,
    getStateNameFromCode,
    getStateFromGSTIN
};
