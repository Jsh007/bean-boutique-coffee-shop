/* Eigbe Joshua, 224473, Frontend web development
 *
 * IndexedDB layout (object stores + key path `id` on every record):
 *
 * user
 *   id, imageUrl, firstName, lastName, emailAddress, streetAddress, city, state, zipCode
 *
 * coffee
 *   id, imageUrl, images[], sku, name, category ("coffee"), description, specie, type,
 *   tastingNote, appearance, intensity, grindSize, brewingMethod, weight (fixed "1kg"),
 *   qty, price, origin, processing, roastProfile, isPromo, promoPrice, createdDate
 *
 * (There is no separate offers store: the Offers page merges promo rows from coffee +
 * equipment where isPromo is true.)
 *
 * equipment
 *   id, imageUrl, images[], sku, name, category ("equipment"), description, qty, price,
 *   isPromo, promoPrice, createdDate
 *
 * cart
 *   id, imageUrl, sku, name, qty, unitPrice, totalPrice, createdDate
 *
 * event
 *   id, imageUrl (optional banner), name, description, venue, date, createdDate
 *
 * attendee
 *   id, firstName, lastName, email, createdDate
 *   + eventId (foreign key -> event.id) REQUIRED for workshop UI even though the written
 *     schema list omitted it; index `eventId` supports “who registered for this event”.
 *   + userId (optional FK -> user.id) links RSVP rows to the signed-in profile when present.
 *
 * subscriptionPlan
 *   id, productId (FK -> coffee.id | equipment.id), name, description, category,
 *   commitment, minimumQty, discount, imageUrl (optional hero for plan cards + PDP), createdDate
 *
 * subscription
 *   id, planId (FK), productId (FK), userId (FK), name, description, category, productQty,
 *   totalPrice, subscribeDate, expireDate, commitment, interval, createdDate
 */

(function (global) {
  'use strict';

  var DB_NAME = 'BeanBoutiqueDB';
  var DB_VERSION = 1;

  var STORE_ORDER = [
    'user',
    'coffee',
    'equipment',
    'cart',
    'event',
    'attendee',
    'subscriptionPlan',
    'subscription'
  ];

  function openDatabase() {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = function () {
        reject(request.error);
      };
      request.onsuccess = function () {
        resolve(request.result);
      };
      request.onupgradeneeded = function (event) {
        var db = event.target.result;

        if (!db.objectStoreNames.contains('user')) {
          db.createObjectStore('user', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('coffee')) {
          var coffee = db.createObjectStore('coffee', { keyPath: 'id' });
          coffee.createIndex('sku', 'sku', { unique: true });
          coffee.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains('equipment')) {
          var equipment = db.createObjectStore('equipment', { keyPath: 'id' });
          equipment.createIndex('sku', 'sku', { unique: true });
          equipment.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains('cart')) {
          var cart = db.createObjectStore('cart', { keyPath: 'id' });
          cart.createIndex('sku', 'sku', { unique: false });
        }

        if (!db.objectStoreNames.contains('event')) {
          db.createObjectStore('event', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('attendee')) {
          var attendee = db.createObjectStore('attendee', { keyPath: 'id' });
          attendee.createIndex('eventId', 'eventId', { unique: false });
          attendee.createIndex('email', 'email', { unique: false });
        }

        if (!db.objectStoreNames.contains('subscriptionPlan')) {
          var plan = db.createObjectStore('subscriptionPlan', { keyPath: 'id' });
          plan.createIndex('productId', 'productId', { unique: false });
          plan.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains('subscription')) {
          var sub = db.createObjectStore('subscription', { keyPath: 'id' });
          sub.createIndex('planId', 'planId', { unique: false });
          sub.createIndex('productId', 'productId', { unique: false });
          sub.createIndex('userId', 'userId', { unique: false });
        }
      };
    });
  }

  function clearStore(tx, storeName) {
    return new Promise(function (resolve, reject) {
      var store = tx.objectStore(storeName);
      var req = store.clear();
      req.onsuccess = function () {
        resolve();
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  function bulkPut(tx, storeName, rows) {
    var store = tx.objectStore(storeName);
    rows.forEach(function (row) {
      store.put(row);
    });
  }

  /**
   * Replaces seed data for every catalogue store. Skips `meta` from JSON payload.
   * @param {Record<string, unknown>} payload
   */
  function importSeedPayload(payload) {
    return openDatabase().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_ORDER, 'readwrite');

        function fail(error) {
          try {
            db.close();
          } catch (closeError) {
            /** ignore **/
          }
          reject(error);
        }

        tx.oncomplete = function () {
          try {
            db.close();
          } catch (closeError) {
            /** ignore **/
          }
          resolve(true);
        };
        tx.onerror = function () {
          fail(tx.error || new Error('IndexedDB transaction failed'));
        };
        tx.onabort = function () {
          fail(tx.error || new Error('IndexedDB transaction aborted'));
        };

        STORE_ORDER.reduce(function (chain, storeName) {
          return chain.then(function () {
            return clearStore(tx, storeName);
          });
        }, Promise.resolve())
          .then(function () {
            bulkPut(tx, 'user', payload.user || []);
            bulkPut(tx, 'coffee', payload.coffee || []);
            bulkPut(tx, 'equipment', payload.equipment || []);
            bulkPut(tx, 'cart', payload.cart || []);
            bulkPut(tx, 'event', payload.event || []);
            bulkPut(tx, 'attendee', payload.attendee || []);
            bulkPut(tx, 'subscriptionPlan', payload.subscriptionPlan || []);
            bulkPut(tx, 'subscription', payload.subscription || []);
          })
          .catch(fail);
      });
    });
  }

  function getAll(storeName) {
    return openDatabase().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readonly');
        var store = tx.objectStore(storeName);
        var req = store.getAll();
        req.onsuccess = function () {
          resolve(req.result);
          db.close();
        };
        req.onerror = function () {
          reject(req.error);
          db.close();
        };
      });
    });
  }

  function getRecord(storeName, id) {
    return openDatabase().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readonly');
        var store = tx.objectStore(storeName);
        var req = store.get(id);
        req.onsuccess = function () {
          resolve(req.result);
          db.close();
        };
        req.onerror = function () {
          reject(req.error);
          db.close();
        };
      });
    });
  }

  function putRecord(storeName, payload) {
    return openDatabase().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readwrite');
        tx.oncomplete = function () {
          try {
            db.close();
          } catch (e) {}
          resolve(true);
        };
        tx.onerror = function () {
          try {
            db.close();
          } catch (e) {}
          reject(tx.error || new Error('putRecord failed'));
        };
        tx.objectStore(storeName).put(payload);
      });
    });
  }

  function deleteRecord(storeName, id) {
    return openDatabase().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readwrite');
        tx.oncomplete = function () {
          try {
            db.close();
          } catch (e) {}
          resolve(true);
        };
        tx.onerror = function () {
          try {
            db.close();
          } catch (e) {}
          reject(tx.error || new Error('deleteRecord failed'));
        };
        tx.objectStore(storeName).delete(id);
      });
    });
  }

  function notifyCartChanged() {
    try {
      document.dispatchEvent(new CustomEvent('beanboutique:cart-changed'));
    } catch (err) {
      /** ignore **/
    }
  }

  /**
   * @param {'coffee' | 'equipment'} category
   * @param {string} productId
   */
  function addProductToCart(category, productId) {
    var store = category === 'coffee' ? 'coffee' : 'equipment';
    return getRecord(store, productId).then(function (product) {
      if (!product) {
        throw new Error('Product not available locally yet.');
      }
      var unit = product.isPromo && product.promoPrice != null
        ? Number(product.promoPrice)
        : Number(product.price);
      return getAll('cart').then(function (lines) {
        var match = (lines || []).filter(function (row) {
          return row.sku === product.sku;
        })[0];
        var nowIso = new Date().toISOString();

        if (match) {
          var nextQty = Number(match.qty || 1) + 1;
          return putRecord('cart', {
            id: match.id,
            imageUrl: product.imageUrl || match.imageUrl,
            sku: product.sku,
            name: product.name,
            qty: nextQty,
            unitPrice: unit,
            totalPrice: Number((nextQty * unit).toFixed(2)),
            createdDate: match.createdDate || nowIso,
            productCategory: category,
            referenceProductId: productId
          }).then(function (result) {
            notifyCartChanged();
            return result;
          });
        }

        return putRecord('cart', {
          id: 'cart-live-' + Date.now(),
          imageUrl: product.imageUrl,
          sku: product.sku,
          name: product.name,
          qty: 1,
          unitPrice: unit,
          totalPrice: Number(unit.toFixed(2)),
          createdDate: nowIso,
          productCategory: category,
          referenceProductId: productId
        }).then(function (result) {
          notifyCartChanged();
          return result;
        });
      });
    });
  }

  /** @param {{ eventId:string, firstName:string, lastName:string, email:string, userId?:string|null }} row */
  function addAttendeeRecord(row) {
    var attendee = {
      id: 'attendee-live-' + Date.now(),
      eventId: row.eventId,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      userId: row.userId || null,
      createdDate: new Date().toISOString()
    };
    return putRecord('attendee', attendee);
  }

  global.BeanBoutiqueDB = {
    DB_NAME: DB_NAME,
    DB_VERSION: DB_VERSION,
    STORES: STORE_ORDER,
    openDatabase: openDatabase,
    importSeedPayload: importSeedPayload,
    getAll: getAll,
    putRecord: putRecord,
    deleteRecord: deleteRecord,
    addProductToCart: addProductToCart,
    addAttendeeRecord: addAttendeeRecord,
    getRecord: getRecord
  };
})(window);
