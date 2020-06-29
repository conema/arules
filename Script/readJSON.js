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

loadJSON('/Rules/rules.json').then(function (response) {
    var rules = JSON.parse(response);
    document.getElementById(rules[0]["object"]).setAttribute("cursor-listener", "");

    var operators = {
        '+': function (a, b) { return a + b },
        '-': function (a, b) { return a - b },
        '==': function (a, b) { return a == b },
        '<=': function (a, b) { return a <= b },
        '>=': function (a, b) { return a >= b }
    }

    var idMap = new Map();

    // Create the map of the rules
    for (var r of rules) {
        var id = r["object"];

        if (idMap.get(id) != undefined) {
            var ruleMap = idMap.get(id);

            if (ruleMap.get(r["action"]) != undefined) {
                // This action is already present in this object
                ruleMap.get(r["action"]).push(r);
            } else {
                // First time for this action with this object
                idMap.set(id, new Map().set(r["action"], [r]))
            }
        } else {
            // First time for this object id
            idMap.set(id, new Map().set(r["action"], [r]))
        }
    }

    // Add events listeners
    for (let [id, actions] of idMap) {
        for (let [action, rules] of actions){
            document.getElementById(id).addEventListener(action, function (event) {

                // copy the object (so we don't lose the old state)
                var object = event.target.cloneNode(true);
                object.object3D = event.target.object3D.clone();        // deepclone of threejs object

                for (var r of rules) {
                    var modifiedObject = event.target;

                    //  condition
                    var attribute = r["if"]["attribute"];
                    var condition = r["if"]["condition"];
                    var value = r["if"]["value"];
        
                    // then
                    var attributeThen = r["then"]["attribute"];
                    var valueThen = r["then"]["value"];


                    // execute "then" if the "condition" is true or if no condition is defined
                    if (Object.entries(r["if"]).length === 0 || operators[condition](object.getAttribute(attribute), value)) {
                        modifiedObject.setAttribute(attributeThen, valueThen);
                    }
                }
            });
        }
    }
});