/**
 *
 * User: Leon Stankowski
 * Email: leon_monty@stankowski.com
 * Date: 10/14/12
 * Time: 12:22 AM
 *
 */

'use strict';


function getSubItem(item, path) {
    var pathElements = path.split('.');
    var pathElementsLength = pathElements.length;

    for (var i = 0; i < pathElementsLength; ++i) {
        var pathElement = pathElements[i];
        if (typeof item !== 'object') return undefined;
        item = item[pathElement];
    }

    return item;
}


var CriteriaTypeMismatch = new Error('criteria type mismatch');
var OrRequiresNonEmptyArray = new Error('$or requires nonempty array');

var testOperators = {};

testOperators.$gt = function(item, criteria) {
    if (criteria instanceof Object) return CriteriaTypeMismatch;
    return item > criteria;
}

testOperators.$gte = function(item, criteria) {
    if (criteria instanceof Object) return CriteriaTypeMismatch;
    return item >= criteria;
}

testOperators.$lt = function(item, criteria) {
    if (criteria instanceof Object) return CriteriaTypeMismatch;
    return item < criteria;
}

testOperators.$lte = function(item, criteria) {
    if (criteria instanceof Object) return CriteriaTypeMismatch;
    return item <= criteria;
}

testOperators.$ne = function(item, criteria) {
    if (criteria instanceof Object) return CriteriaTypeMismatch;
    return item !== criteria;
}

testOperators.$in = function(item, criteria) {
    if (criteria instanceof Array) {
        var criteriaLength = criteria.length;
        for (var i = 0; i < criteriaLength; ++i) {
            var subCriteria = criteria[i];
            var disposition = testExpression(item, subCriteria);
            if (disposition === true) return disposition;
        }
        return false;
    }
    return CriteriaTypeMismatch;
}

testOperators.$all = function(item, criteria) {
    if (criteria instanceof Array) {
        var criteriaLength = criteria.length;
        for (var i = 0; i < criteriaLength; ++i) {
            var subCriteria = criteria[i];
            var disposition = testExpression(item, subCriteria);
            if (disposition !== true) return disposition;
        }
        return true;
    }
    return CriteriaTypeMismatch;
}

testOperators.$exists = function(item, criteria) {
    var typeofItem = typeof item;
    if (typeofItem === 'undefined' || typeofItem === 'null') return false;
    return true;
}

testOperators.$nin = function(item, criteria) {
    var disposition = testOperators.$in(item, criteria);
    if (disposition === true) {
        disposition = false;
    } else if (disposition === false) {
        disposition = true;
    }
    return disposition;
}

testOperators.$or = function(item, criteria) {
    if (criteria instanceof Array) {
        var disposition = OrRequiresNonEmptyArray;
        var criteriaLength = criteria.length;
        for (var i = 0; i < criteriaLength; ++i) {
            var subCriteria = criteria[i];
            var disposition = testCriteria(item, subCriteria);
            if (disposition === true) return disposition;
        }
        return disposition;
    }
    return CriteriaTypeMismatch;
}

// $in, $nin, $or WHERE item is an array
// $nor, $and, $size, $mod, $type
// $elemMatch


function testExpression(item, criteria) {
    var disposition = false;

    /*
    console.log('');
    console.log('testExpression item = ', item);
    console.log('testExpression criteria = ', criteria);
    */

    if (typeof criteria === 'object') {
        if (criteria instanceof RegExp) {
            disposition = criteria.test(item);
            //console.log('testExpression(' + item + ', ' + criteria + ')  -> ', disposition);

        } else {
            return testCriteria(item, criteria);
        }

    } else {
        disposition = (item === criteria);
        //console.log('testExpression(' + item + ', ' + criteria + ')  -> ', disposition);
    }
    return disposition;
}


function testCriteria(item, criteria) {
    var disposition = true;
    var criteriaKeys = Object.keys(criteria);
    var criteriaKeysLength = criteriaKeys.length;

    /*
    console.log('');
    console.log('testCriteria item = ', item);
    console.log('testCriteria criteria = ', criteria);
    */

    for (var criteriaKeyIndex = 0; criteriaKeyIndex < criteriaKeysLength; ++criteriaKeyIndex) {
        var criteriaKey = criteriaKeys[criteriaKeyIndex];
        var subCriteria = criteria[criteriaKey];

        var operator = testOperators[criteriaKey];
        if (operator) {
            disposition = operator(item, subCriteria);
        } else {
            var subItem = getSubItem(item, criteriaKey);
            disposition = testExpression(subItem, subCriteria);
        }
        if (disposition !== true) return disposition;
    }

    return disposition;
}


function makeFind(dataSourceList) {
    var find = function (criteria, /* optional */ cb) {
        var err;
        var resultList = [];
        var dataSourceListLength = dataSourceList.length;
        for (var i = 0; i < dataSourceListLength; ++i) {
            var dataSourceItem = dataSourceList[i];
            var disposition = testCriteria(dataSourceItem, criteria);
            if (disposition === true) {
                resultList.push(dataSourceItem);
            } else if (disposition !== false) {
                err = disposition;
                break;
            }
        }

        if (cb) {
            process.nextTick(function () { cb(err, resultList); });
        } else if (err) {
            console.log('find(), err = ', err);
        }
        return err ? null : resultList;
    };
    return find;
}


exports.makeFind = makeFind;
