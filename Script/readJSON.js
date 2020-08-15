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

loadJSON('/Rules/rules.json').then(function (response) {
    var rules = JSON.parse(response);
    document.getElementById(rules[0]["object"]).setAttribute("cursor-listener", "");

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

    var idMap = new Map();
    var defaultMap = new Map();

    // Create map of default rules
    for (var r of rules) {
        if (r["default"] === true) {
            if (defaultMap.get(r["action"]) === undefined) {
                // First time for this object id
                defaultMap.set(r["action"], r)
            }
        }
    }

    // Create the map of the rules
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


        if (r["then"]["action"] != undefined) {
            id = r["then"]["object"]
            action = r["then"]["action"]
            r2 = defaultMap.get(r["then"]["action"])

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

    // Add events listeners
    for (let [id, actions] of idMap) {
        for (let [action, rules] of actions) {
            document.getElementById(id).addEventListener(removeSpaces(action), function (event) {
                // copy the object (so we don't lose the old state)
                var object = event.target.cloneNode(true);
                object.object3D = event.target.object3D.clone();        // deepclone of threejs object

                // Remember the initial state of the objects (it could change when we apply the rules)
                var oldStates = new Map();

                for (var r of rules) {
                    //  condition
                    var resultCondition = false;
                    var objectCondition = r["if"]["object"];
                    var attribute = r["if"]["attribute"];
                    var condition = r["if"]["condition"];
                    var value = r["if"]["value"];

                    // Check synonyms
                    if (synonyms.get(condition) != undefined) {
                        condition = synonyms.get(condition)
                    }
                    
                    if (synonyms.get(value) != undefined) {
                        value = synonyms.get(value)
                    }

                    // Evaluation condition
                    if (typeof (value) == "string" && value.includes(".")) {
                        value = value.replace(/([A-z1-9]+)\.([A-z1-9]+)\.([A-z1-9]+)/g, "document.getElementById(\"$1\").getAttribute(\"$2\").$3");
                        value = value.replace(/[^\.]\b([A-z]+)\.([A-z]+)[\s\}\+\*\-\\\%\&\|]/g, "document.getElementById(objectCondition).getAttribute(\"$1\").$2");

                        value = value.replace("{", "");
                        value = value.replace("}", "");

                        value = eval(value);
                    }

                    if (typeof (attribute) == "string" && attribute.includes(".")) {
                        attribute = attribute.replace(/([A-z]|\.)+/g, "document.getElementById(objectCondition).getAttribute(\"$&\")");
                        attribute = attribute.replace(/\(\"(\w+)(\.\w)\"\)/g, "(\"$1\")$2");
                        attribute = attribute.replace("{", "");
                        attribute = attribute.replace("}", "");

                        attribute = eval(attribute);
                    } else {
                        if (objectCondition != undefined) {
                            // if an object is defined in the condition


                            if (oldStates.get(objectCondition) === undefined) {
                                // Register the original state
                                state = document.getElementById(objectCondition).cloneNode(true);
                                state.object3D = document.getElementById(objectCondition).object3D.clone();
                                oldStates.set(objectCondition, state)
                            }

                            attribute = oldStates.get(objectCondition).getAttribute(attribute)
                        } else {
                            // if no object is defined in the condition, take the object of the when
                            attribute = object.getAttribute(attribute)
                        }
                    }

                    // then
                    var objectThen = r["then"]["object"];
                    var attributeThen = r["then"]["attribute"] || r["then"]["action"];
                    var valueThen = r["then"]["value"];

                    // Check synonyms
                    if (synonyms.get(valueThen) != undefined) {
                        valueThen = synonyms.get(valueThen)
                    }

                    // Evaluation value
                    if (typeof (valueThen) == "string" && valueThen.charAt(0) == "{") {
                        valueThen = valueThen.replace(/([A-z1-9]+)\.([A-z1-9]+)\.([A-z1-9]+)/g, "document.getElementById(\"$1\").getAttribute(\"$2\").$3");
                        valueThen = valueThen.replace(/[^\.]\b([A-z]+)\.([A-z]+)[\s\}\+\*\-\\\%\&\|]/g, "document.getElementById(objectThen).getAttribute(\"$1\").$2");

                        valueThen = valueThen.replace("{", "");
                        valueThen = valueThen.replace("}", "");

                        valueThen = eval(valueThen);
                    }

                    // Evaluation attribute
                    if (attributeThen.includes(".")) {
                        var before = attributeThen.match(/(\w+?)\.\w+/)[1];
                        var after = attributeThen.match(/\w+\.(\w+?)/)[1];

                        var currentValue = { ...document.getElementById(objectThen).getAttribute(before) };
                        currentValue[after] = valueThen;
                        valueThen = currentValue;
                        attributeThen = before;
                    }

                    var modifiedObject = document.getElementById(objectThen) || event.target;

                    // execute "then" if the "condition" is true or if no condition is defined
                    if (Object.entries(r["if"]).length === 0 || operators[condition](attribute, value)) {
                        if (r["default"] == true) {
                            // Fallback to map custom actions rules (e.g. change color to) to real events
                            modifiedObject.setAttribute(attributeThen, modifiedObject.getAttribute(removeSpaces(action)))
                        } else {
                            modifiedObject.setAttribute(removeSpaces(attributeThen), valueThen);
                            modifiedObject.dispatchEvent(new Event(removeSpaces(attributeThen)))
                        }
                    }
                }
            });
        }
    }
});