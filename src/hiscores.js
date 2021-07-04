const axios = require('axios');
const { HISCORES_URLS, STATS } = require('./constants');

/**
 * Converts the stats CSV to a 2d array
 *
 * @access private
 * @param {string} csv CSV string of a player's stats
 */
const _csvToArray = (csv) => {
  const csvArray = csv.split('\n');

  csvArray.pop(); // removes the last item since it's always an empty string

  return csvArray.map((line) => line.split(','));
};

/**
 * Fetches player's CSV stats from the official API
 *
 * @access private
 * @param {string} rsn Player's RuneScape Name
 * @param {string} gamemode Player's game mode
 */
const _fetchPlayerCSV = (rsn, gamemode, config) =>
  new Promise((resolve, reject) => {
    axios
      .get(`${HISCORES_URLS[gamemode]}/index_lite.ws?player=${rsn}`, config)
      .then((res) => {
        const regex = /[^0-9-,\s]/gm;
        const found = regex.exec(res.data);

        if (found) {
          reject(new Error('OSRS API appears to be down.'));
          return;
        }

        resolve(res.data);
      })
      .catch((err) => {
        if (!err.response)
          reject(new Error('An unknown networking error occurred.'));
        else if (
          (err.response.data && err.response.data.includes('not found')) ||
          (err.data && err.data.includes('not found'))
        )
          reject(new Error('Player not found! Check RSN or game mode.'));
        else reject(err);
      });
  });

/**
 * Returns a mapped out skills stats object
 *
 * @access private
 * @param {Object[]} statsArray Array obtained from csvToArray()
 */
const _parseSkills = (statsArray) => {
  const stats = statsArray.slice(0, 24); // skill stats always are the first 23 items

  const skills = {};

  STATS.skills.forEach((skill, i) => {
    skills[skill] = {
      rank: stats[i][0],
      level: stats[i][1],
      xp: stats[i][2],
    };
  });

  return skills;
};

/**
 * Returns a mapped out clues stats object
 *
 * @access private
 * @param {Object[]} statsArray Array obtained from csvToArray()
 */
const _parseClues = (statsArray) => {
  const stats = statsArray.slice(27, 34);

  const clues = {};

  STATS.clues.forEach((clue, i) => {
    clues[clue] = {
      rank: stats[i][0],
      score: stats[i][1],
    };
  });

  return clues;
};

/**
 * Returns a mapped out bounty hunter stats object
 *
 * @access private
 * @param {Object[]} statsArray Array obtained from csvToArray()
 */
const _parseBH = (statsArray) => {
  const stats = statsArray.slice(24, 26);

  const bh = {};

  STATS.bh.forEach((mode, i) => {
    bh[mode] = {
      rank: stats[i][0],
      score: stats[i][1],
    };
  });

  return bh;
};

/**
 * Returns a mapped out a LMS stats object
 *
 * @access private
 * @param {Object[]} stats Array obtained from csvToArray()
 */
const _parseLMS = (stats) => {
  const lms = stats[26];

  return { rank: lms[0], score: lms[1] };
};

/**
 * Returns a mapped out SoulWarsZeal stats object
 * 
 * @access private
 * @param {Object[]} stats 
 */
const _parseSoulWarsZeal = (stats) => {
  const swz = stats[35];

  return { rank: swz[0], score: swz[1] };
}

/**
 * Returns Boss kills stats object
 *
 * @access private
 * @param {Object[]} stats Array obtained from csvToArray()
 */
const _parseBosses = (statsArray) => {
  const stats = statsArray.slice(36, 83);

  const bosses = {};

  STATS.bosses.forEach((boss, i) => {
    bosses[boss] = {
      rank: stats[i][0],
      score: stats[i][1],
    };
  });

  return bosses;
};

/**
 * Returns a JSON friendly object with all of the player's hiscores stats
 *
 * @access private
 * @param {Object[]} stats Array obtained from csvToArray()
 */
const _parseStats = (stats) => {
  if (!stats || !Array.isArray(stats) || stats.length <= 0)
    throw new Error('Invalid stats array received!');

  const player = {};

  player.skills = _parseSkills(stats);
  player.bh = _parseBH(stats);
  player.lms = _parseLMS(stats);
  player.clues = _parseClues(stats);
  player.SoulWarsZeal = _parseSoulWarsZeal(stats);
  player.bosses = _parseBosses(stats);

  return player;
};

/**
 * Get a player's stats - Default game mode = 'main'
 *
 * @access public
 * @param {string} rsn Player's RuneScape Name
 * @param {'main' | 'iron' |'uim' |'hcim' | 'dmm' | 'sdmm' | 'dmmt'} gamemode Player's game mode
 */
const getPlayer = async (rsn, gamemode = 'main', config = undefined) => {
  if (!rsn || typeof rsn !== 'string')
    throw new Error('RSN must be of type string');
  else if (rsn.length > 12)
    throw new Error('RSN must be less or equal to 12 characters');

  // Invalid gamemode
  if (!Object.keys(HISCORES_URLS).includes(gamemode))
    throw new Error('Invalid game mode');

  try {
    const csv = await _fetchPlayerCSV(rsn, gamemode, config);

    return _parseStats(_csvToArray(csv));
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getPlayer,
};
