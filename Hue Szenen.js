var HueApi = require("node-hue-api").HueApi;

var host = "192.168.x.x",
    username = "xxxxxxxxxx",
    api = new HueApi(host, username);
    
var groups = [],
    objects = [];

var displayResults = function(result) {
    console.log(JSON.stringify(result, null, 2));
};

var parseGroups = function(result) {
    for (var i = 0; i < result.length; i++) {
        var id = result[i].id,
        name = result[i].name;
        console.debug('group: '+name+' id: '+id);
        groups[id] = name;
    }
    groups[0] = 'All lights';
};

var createStates = function(result) {
    createState('Hue_Scenes.Resync', false, {role: "button", name: 'Resync Groups and Scenes'});

    for (var i = 0; i < result.length; i++) { 
        var regex = /(\w{5})(?:_r|\s+:DA)(\d{2})(?:_d)?(\d{2,3})/;
        if (!regex.test(result[i].appdata.data)){continue;}

        var dataid = regex.exec(result[i].appdata.data)[1],
        room = regex.exec(result[i].appdata.data)[2],
        number = regex.exec(result[i].appdata.data)[3],
        id = result[i].id,
        lights = result[i].lights,
        name = result[i].name.replace(/"/g,''),
        pathname = name.replace(/ /g,'_'),
        group = groups[parseInt(room)] || lights;
        
        if (!objects[room+'§'+pathname]){
            console.debug('scene: '+name);
            createState('Hue_Scenes.'+pathname+'.'+id, false, {role: "button", name: 'Scene: '+name+' ('+group+')'});
            objects[room+'§'+pathname] = true;
        }
    }
};

function deleteStates(){
    $('javascript.0.Hue_Scenes.*').each(function (id) {
        deleteState(id);
    });
}

api.groups(function(err, groups) {
    if (err) throw err;
    console.debug('Processing groups...');
    //displayResults(groups);
    parseGroups(groups);
});

api.scenes(function(err, scenes) {
    if (err) throw err;
    console.debug('Processing scenes...');
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
    setState(obj.id, false);
});

on({id: 'javascript.0.Hue_Scenes.Resync', val: true}, function (obj) {
    console.debug('Resync triggered...');
    
    groups = [];
    api.groups(function(err, groups) {
        if (err) throw err;
        console.debug('Processing groups...');
        parseGroups(groups);
    });
    
    console.debug('Deleting current scenes...');
    objects = [];
    deleteStates();
    
    api.scenes(function(err, scenes) {
        if (err) throw err;
        console.debug('Processing scenes...');
        createStates(scenes);
    });
});
