var HueApi = require("node-hue-api").HueApi;

// Replace IP and username!!!
var host = "192.168.x.x",
    username = "xxxxxxxxxx",
    api = new HueApi(host, username);
    
var groups_ = [],
    lights_ = [],
    objects_ = [];

// Log JSON results
var displayResults = function(result) {
    console.log(JSON.stringify(result, null, 2));
};

// Parse Light Group 0 (All Lights)
var parseGroup0 = function(result) {
    if (!result.lights){return} // Empty group
    
    var id = result.id,
        lights = result.lights,
        name = "All Lights";
    console.debug('group: '+name+', lights: '+lights);
    groups_[lights] = name;
};

// Parse Light Groups
var parseGroups = function(result) {
    for (var i = 0; i < result.length; i++) {
        if (!result[i].lights){continue} // Empty group
        
        var id = result[i].id,
            lights = result[i].lights,
            name = result[i].name;
        console.debug('group: '+name+', lights: '+lights);
        groups_[lights] = name;
    }
};

// Parse Lights
var parseLights = function(result) {
    for (var i = 0; i < result.length; i++) {
        var id = result[i].id,
            name = result[i].name;
        console.debug('light: '+name+', id: '+id);
        lights_[id] = name;
    } 
};

// Create States in ioBroker
var createStates = function(result) {
    // Resync button
    createState('Hue_Scenes.Resync', false, {role: "button", name: 'Resync Groups, Lights and Scenes'});

    for (var i = 0; i < result.length; i++) {
        if (!result[i].appdata.data){continue} // skip internal szenes

        var id = result[i].id,
            lights = result[i].lights,
            name = result[i].name.replace(/"/g,''),
            pathname = name.replace(/ /g,'_');
        
        // Get light names
        var light_names = [];
        for (var j = 0; j < lights.length; j++) {
            var light_name = lights_[lights[j]];
            light_names.push(light_name);
        }

        // Room, group or lights linked with scene
        var group = 'Group: '+groups_[lights] || 'Lights: '+light_names.join(", ");
        
        // Create States and skip duplicates
        if (!objects_[lights+pathname]){
            console.debug('scene: '+name+', '+group);
            createState('Hue_Scenes.'+pathname+'.'+id, false, {role: "button", name: 'Scene: '+name+' ('+group+')'});
            objects_[lights+pathname] = true;
        }
    }
};

// Delete States
function deleteStates(){
    console.log('Deleting current objects for scenes...');
    objects_ = [];
    $('javascript.0.Hue_Scenes.*').each(function (id) {
        deleteState(id);
    });
}

// Fetch data from Hue API
function init(){
    api.getGroup(0, function(err, group0) {
        if (err) throw err;
        console.debug('Processing group 0...');
        //displayResults(group0);
        parseGroup0(group0);
    });
    api.groups(function(err, groups) {
        if (err) throw err;
        console.debug('Processing groups...');
        //displayResults(groups);
        parseGroups(groups);
    });

    api.lights(function(err, lights) {
        if (err) throw err;
        console.debug('Processing lights...');
        //displayResults(lights);
        parseLights(lights.lights);
    });

    api.scenes(function(err, scenes) {
        if (err) throw err;
        console.debug('Processing scenes...');
        //displayResults(scenes);
        createStates(scenes);
    });
}

// Init on start
init();

// Activate scene
on({id: /^javascript\.0\.Hue_Scenes\./, val: true}, function (obj) {
    if (obj.id == 'javascript.0.Hue_Scenes.Resync'){return}
    sceneId = obj.id.split('.').pop();
    console.log('Activating '+obj.name);
    api.activateScene(sceneId, function(err, result) {
        if (err) throw err;
        displayResults(result);
    });
    setState(obj.id, false);
});

// Resync
on({id: 'javascript.0.Hue_Scenes.Resync', val: true}, function (obj) {
    console.log('Resync triggered...');
    groups_ = [];
    lights_ = [];
    deleteStates();
    init();
});
