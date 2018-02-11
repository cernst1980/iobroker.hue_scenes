var HueApi = require("node-hue-api").HueApi

var host = "192.168.x.x",
    username = "xxxxxxxxxx",
    api = new HueApi(host, username);
    
var light_list = [];

var displayResults = function(result) {
    console.log(JSON.stringify(result, null, 2));
};

var parseGroup0 = function(result) {
    var id = result.id,
    lights = result.lights,
    name = 'All lights',
    type = result.type;
    console.debug('Group: '+name);
    light_list[lights] = name;
};

var parseGroups = function(result) {
    for (var i = 0; i < result.length; i++) {
        if (!result[i].lights){continue;}
        
        var id = result[i].id,
        lights = result[i].lights,
        name = result[i].name,
        type = result[i].type;
        console.debug('Group: '+name);
        light_list[lights] = name;
    } 
};

var createStates = function(result) {
    createState('Hue_Scenes.Resync', false, {role: "button", name: 'Resync Groups and Scenes'});
    for (var i = 0; i < result.length; i++) { 
        if (!result[i].appdata.data){continue;}
        
        var id = result[i].id,
        lights = result[i].lights,
        name = result[i].name.replace(/"/g,''),
        pathname = name.replace(/ /g,'_'),
        group = light_list[lights] || lights;

        if (name.indexOf("-Switch") !== -1){continue;}

        console.debug('Scene: '+name);
        createState('Hue_Scenes.'+pathname+'.'+id, false, {role: "button", name: 'Scene: '+name+' ('+group+')'});
    }
};

function deleteStates(){
    $('javascript.0.Hue_Scenes.*').each(function (id) {
        deleteState(id);
    });
}

api.getGroup(0, function(err, group0) {
    if (err) throw err;
    console.debug('Processing Group 0...');
    //displayResults(group0);
    parseGroup0(group0);
});

api.groups(function(err, groups) {
    if (err) throw err;
    console.debug('Processing Groups...');
    //displayResults(groups);
    parseGroups(groups);
});

console.debug('Deleting current scenes...');
deleteStates();

api.scenes(function(err, scenes) {
    if (err) throw err;
    console.debug('Processing Scenes...');
    //displayResults(scenes);
    createStates(scenes);
});

on({id: /^javascript\.0\.Hue_Scenes\./, val: true}, function (obj) {
    sceneId = obj.id.split('.').pop();
    console.debug('Activating '+obj.name);
    api.activateScene(sceneId, function(err, result) {
        if (err) throw err;
        displayResults(result);
    });
});

on({id: 'javascript.0.Hue_Scenes.Resync', val: true}, function (obj) {
    console.debug('Resync triggered...');
    
    api.getGroup(0, function(err, group0) {
        if (err) throw err;
        console.debug('Processing Group 0...');
        parseGroup0(group0);
    });

    api.groups(function(err, groups) {
        if (err) throw err;
        console.debug('Processing Groups...');
        parseGroups(groups);
    });
    
    console.debug('Deleting current scenes...');
    deleteStates();
    
    api.scenes(function(err, scenes) {
        if (err) throw err;
        console.debug('Processing Scenes...');
        createStates(scenes);
    });
});
