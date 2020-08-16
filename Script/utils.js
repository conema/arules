function loadJSON(path) {
    return new Promise(function (resolve, reject) {
        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', path, true);
        xobj.onreadystatechange = function () {
            if (xobj.readyState == 4 && xobj.status == "200") {
                resolve(xobj.responseText);
            }
        };
        xobj.send(null);
    });
}

function removeSpaces(string) {
    return string.replace(/ /g, '')
}

var operators = {
    '+': function (a, b) {
        return a + b
    },
    '-': function (a, b) {
        return a - b
    },
    '==': function (a, b) {
        return a == b
    },
    '!=': function (a, b) {
        return a != b
    },
    '>': function (a, b) {
        return a > b
    },
    '<': function (a, b) {
        return a < b
    },
    '<=': function (a, b) {
        return a <= b
    },
    '>=': function (a, b) {
        return a >= b
    }
};

var synonyms = new Map()
synonyms.set("off", 0)
synonyms.set("on", 1)
synonyms.set("is", "==")
synonyms.set("is not", "!=")

// Create map of default rules
function createDefaultMap(rules, defaultMap) {
    for (var r of rules) {
        if (r["default"] === true) {
            if (defaultMap.get(r["action"]) === undefined) {
                // First time for this object id
                defaultMap.set(r["action"], r)
            }
        }
    }
}

// Create the map of the rules
function createidMap(rules, idMap, defaultMap){
    for (var r of rules) {
        var id = r["object"]
        var action = r["action"]

        if (r["default"] === true)
            continue

        if (idMap.get(id) != undefined) {
            var ruleMap = idMap.get(id);

            if (ruleMap.get(action) != undefined) {
                // This action is already present in this object
                ruleMap.get(action).push(r);
            } else {
                // First time for this action with this object
                ruleMap.set(action, [r])
            }
        } else {
            // First time for this object id
            idMap.set(id, new Map().set(action, [r]))
        }


        for (var then of r["then"]) {
            if (then["action"] != undefined) {
                let id = then["subject"]
                let action = then["action"]
                let r2 = defaultMap.get(then["action"])

                // TODO: da sistemare
                if (idMap.get(id) != undefined) {
                    var ruleMap = idMap.get(id);

                    if (ruleMap.get(action) === undefined) {
                        // First time for this action with this object
                        ruleMap.set(action, [r2])
                    }
                } else {
                    // First time for this object id
                    idMap.set(id, new Map().set(action, [r2]))
                }
            }
        }
    }
}

function substituteSynonyms(value){
    if (synonyms.get(value) != undefined){
        // if a synonyms is used return it
        return synonyms.get(value)
    }
    
    return value
}

// Eval values (e.g. given "{3+6+2+object.position.x}" as value the function returns 11+object.position.x) 
function evalValue(value, condition){
    if (typeof (value) == "string" && value.includes("{")) {
        value = value.replace(/([A-z1-9]+)\.([A-z1-9]+)\.([A-z1-9]+)/g, "document.getElementById(\"$1\").getAttribute(\"$2\").$3");
        value = value.replace(/[^\.]\b([A-z]+)\.([A-z]+)[\s\}\+\*\-\\\%\&\|]/g, "document.getElementById(condition).getAttribute(\"$1\").$2");

        value = value.replace("{", "");
        value = value.replace("}", "");

        return eval(value);
    }

    return value
}


export {loadJSON, removeSpaces, operators, synonyms, createDefaultMap, createidMap, substituteSynonyms, evalValue}