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
    synonyms.set("closed", "true")
    synonyms.set("open", "false")

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


        for (var then of r["then"]) {
            if (then["action"] != undefined) {
                id = then["subject"]
                action = then["action"]
                r2 = defaultMap.get(then["action"])

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
                    var conditionEvaluated = true
                    if (r["if"] != undefined) {
                        for (var ifr of r["if"]) {
                            //  if
                            var resultCondition = false;
                            var objectCondition = ifr["object"];
                            var attribute = ifr["attribute"];
                            var condition = ifr["condition"];
                            var value = ifr["value"];

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

                            conditionEvaluated = conditionEvaluated && operators[condition](attribute, value)
                        }
                    }

                    for (var then of r["then"]) {
                        // then
                        var subjectThen = then["subject"];
                        var attributeThen = then["attribute"] || then["action"];
                        var valueThen = then["value"];

                        var modifiedObject = document.getElementById(subjectThen) || event.target;

                        if (r["default"]) {
                            valueThen = modifiedObject.getAttribute(removeSpaces(action))
                        }

                        // Check synonyms
                        if (synonyms.get(valueThen) != undefined) {
                            valueThen = synonyms.get(valueThen)
                        }

                        // Evaluation value
                        if (typeof (valueThen) == "string" && valueThen.charAt(0) == "{") {
                            valueThen = valueThen.replace(/([A-z1-9]+)\.([A-z1-9]+)\.([A-z1-9]+)/g, "document.getElementById(\"$1\").getAttribute(\"$2\").$3");
                            valueThen = valueThen.replace(/[^\.]\b([A-z]+)\.([A-z]+)[\s\}\+\*\-\\\%\&\|]/g, "document.getElementById(subjectThen).getAttribute(\"$1\").$2");

                            valueThen = valueThen.replace("{", "");
                            valueThen = valueThen.replace("}", "");

                            valueThen = eval(valueThen);
                        }

                        // Evaluation attribute
                        if (attributeThen.includes(".")) {
                            var before = attributeThen.match(/(\w+?)\.\w+/)[1];
                            var after = attributeThen.match(/\w+\.(\w+?)/)[1];

                            if (r["default"]) {
                                var currentValue = { ...event.target.getAttribute(before) }
                            } else {
                                var currentValue = { ...document.getElementById(subjectThen).getAttribute(before) }
                            }

                            // Create position = {x, y, z}
                            currentValue[after] = valueThen;
                            valueThen = currentValue;
                            attributeThen = before;
                        }

                        // Execute "then" if the conditions are true or if no condition is defined
                        if (conditionEvaluated) {
                            modifiedObject.setAttribute(removeSpaces(attributeThen), valueThen);
                            if (!r["default"]) {
                                // Dispach the event only if it isn't a default rules
                                modifiedObject.dispatchEvent(new Event(removeSpaces(attributeThen)))
                            }
                        }
                    }
                }
            });
        }
    }
});