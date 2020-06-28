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
        '+': function(a, b){ return a+b},
        '-': function(a, b){ return a-b},
        '==': function(a, b){ return a==b}
    }


    for (var r of rules)
    {
        // subject action
        var action = r["action"];

        //  condition
        var object = document.getElementById(r["object"]);
        var attribute = r["if"]["attribute"];
        var condition = r["if"]["condition"];
        var value = r["if"]["value"];

        // then
        var attributeThen = r["then"]["attribute"];
        var valueThen = r["then"]["value"];

        //object.addEventListener('componentchanged', function (evt) {

        (function(r){
            object.addEventListener(action, function () {
                // subject action
                var action = r["action"];

                //  condition
                var object = document.getElementById(r["object"]);
                var attribute = r["if"]["attribute"];
                var condition = r["if"]["condition"];
                var value = r["if"]["value"];

                // then
                var attributeThen = r["then"]["attribute"];
                var valueThen = r["then"]["value"];

                if (operators[condition](object.getAttribute(attribute), value)) {
                    object.setAttribute(attributeThen, valueThen)
                    console.log(valueThen)
                }
            });
        })(r);


        //});
    }
});