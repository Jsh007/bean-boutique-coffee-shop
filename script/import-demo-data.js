/*
 * Eigbe Joshua, 224473, Frontend web development
 * Fetches the bundled JSON catalogue and pushes it through BeanBoutiqueDB.importSeedPayload.
 */

(function (global) {
  'use strict';

  /**
   * @param {string} demoJsonUrl Resolved URL compatible with fetch (must be http(s); not file:// alone)
   */
  function fetchAndImportSeed(demoJsonUrl) {
    return fetch(demoJsonUrl, { cache: 'no-store' }).then(function (response) {
      if (!response.ok) {
        throw new Error('Could not fetch demo catalogue (' + response.status + '). Serve this folder via a local web server.');
      }
      return response.json();
    }).then(function (payload) {
      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid JSON payload.');
      }
      var dbApi = global.BeanBoutiqueDB;
      if (!dbApi || typeof dbApi.importSeedPayload !== 'function') {
        throw new Error('BeanBoutiqueDB is not loaded; include script/db.js before this file.');
      }
      return dbApi.importSeedPayload(payload);
    });
  }

  global.BeanBoutiqueImporter = {
    fetchAndImportSeed: fetchAndImportSeed
  };
})(window);
