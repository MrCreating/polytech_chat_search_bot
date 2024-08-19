const groupCodes = {
    'ФИЗМЕХ': 50,
    'ИЭИТ': 49,
    'ГИ': 38,
    'ИЭ': 32,
    'ИППТ': 43,
    'ИСИ': 31,
    'ИПМЭИТ': 37,
    'ИФКСИТ': 42,
    'ИБСИБ': 47,
    'ПИШ': 53,
    'ИММИТ': 33,
    'ИКНК': 51
};

module.exports = function (data, lastDigit = true) {
    const instituteNumber = String(groupCodes[data.institute.toUpperCase()]);

    const explodedDir = data.direction.trim().split('_')[0].split('.');
    let profileNumber = data.direction.trim().split('_')[1];
    if (!profileNumber) {
        return null;
    }

    const lastDigitString = lastDigit ? '01' : '';

    return instituteNumber + '4' + explodedDir[0] + explodedDir[2] + '/4' + String(profileNumber) + lastDigitString;
}
