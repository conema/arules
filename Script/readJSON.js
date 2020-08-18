import {loadJSON, removeSpaces, operators, synonyms, createDefaultMap, createidMap, substituteSynonyms, evalValue} from '/Script/utils.js'


loadJSON('/Rules/rules.json').then(function (response) {
    var rules = JSON.parse(response);
    //document.getElementById(rules[0]["object"]).setAttribute("cursor-listener", "");

    var idMap = new Map();
    var defaultMap = new Map();

    createDefaultMap(rules, defaultMap)
    createidMap(rules, idMap, defaultMap)

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
                    
                    // Go to the next rule if the subject is wrong
                    if (event.detail != undefined) {
                        if (event.detail.cursorEl != undefined){
                            if (r["subject"] !=  event.detail.cursorEl.id) {
                                continue
                            }
                        }

                        // Add other "ifs" for the other cases (e.g. if two object collide)
                    } else if (r["default"]){
                        if (r["subject"] != undefined && r["subject"] != event.target.id){
                            continue
                        }
                    }


                    //console.log(event.detail, r["subject"], event)

                    if (r["if"] != undefined) {
                        for (var ifr of r["if"]) {
                            //  if
                            var objectCondition = ifr["object"];
                            var attribute = ifr["attribute"];
                            var condition = ifr["condition"];
                            var value = ifr["value"];

                            // Check synonyms
                            condition = substituteSynonyms(condition)
                            value = substituteSynonyms(value)

                            // Evaluation condition
                            value = evalValue(value, objectCondition)

                            if (typeof (attribute) == "string" && attribute.includes("{")) {
                                attribute = attribute.replace(/([A-z]|\.)+/g, "document.getElementById(objectCondition).getAttribute(\"$&\")");
                                attribute = attribute.replace(/\(\"(\w+)(\.\w)\"\)/g, "(\"$1\")$2");
                                attribute = attribute.replace("{", "");
                                attribute = attribute.replace("}", "");

                                attribute = eval(attribute);
                            } else {
                                if (objectCondition === undefined) {
                                    objectCondition = object.getAttribute("id")
                                }

                                if (oldStates.get(objectCondition) === undefined) {
                                    // Register the original state
                                    let state = document.getElementById(objectCondition).cloneNode(true);
                                    state.object3D = document.getElementById(objectCondition).object3D.clone();
                                    oldStates.set(objectCondition, state)
                                }

                                attribute = oldStates.get(objectCondition).getAttribute(attribute)
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

                        if (then["attribute"] != undefined && then["action"] != undefined){
                            console.error("There can't be an attribute and an action!")
                        }

                        if(r["default"] && valueThen === undefined){
                            valueThen = modifiedObject.getAttribute(removeSpaces(action))
                        }

                        // Check synonyms
                        valueThen = substituteSynonyms(valueThen)

                        // Evaluation value then
                        valueThen = evalValue(valueThen, subjectThen)

                        // Evaluation attribute/action then
                        if (attributeThen.includes(".")) {
                            var before = attributeThen.match(/(\w+?)\.\w+/)[1];
                            var after = attributeThen.match(/\w+\.(\w+?)/)[1];

                            if (r["default"] && subjectThen === undefined) {
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