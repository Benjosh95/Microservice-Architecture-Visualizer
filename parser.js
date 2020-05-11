const fs = require('fs');
const yaml = require('js-yaml');
const plantuml = require('node-plantuml');
const propertiesReader = require('properties-reader');
//Graphviz installed

//Todos:
//  Keylist of interest/configurable
//  File-Reading asynchronous?
//  Build UML String "modulish"
//  Arrow Services Alignment/Positioning
//  Colorcoding?
//  Legend?
//  generisch? 
//  Asynchronous 2 ways of Parsing the TF | X and Modulebased

const serviceMap = {
    allServices: []
};

const getServicesWhiteList = () => {
    return whiteList = fs.readFileSync(`./Repos/Services-Whitelist.txt`, 'utf8')
        .trim()
        .split(/\s+/);
}

const getConfigFileType = (serviceName) => {

    const configDirection = `./Repos/${serviceName}/src/main/resources`

    let fileType = null;

    fs.readdirSync(configDirection).forEach(file => {

            if(file == "application.yml") fileType = "yml"

            else if(file == "application.properties") fileType = "properties"
            
        })

    return fileType;
};

const handleYmlConfig = (serviceName) => {

    let rawYMLConfig = fs.readFileSync(`./Repos/${serviceName}/src/main/resources/application.yml`, 'utf8');
    let parsedYMLConfig = yaml.safeLoad(rawYMLConfig);

    // Filter root- and connected services --> application.yml
    let appName = parsedYMLConfig.spring.application.name;
    let services = Object.keys(parsedYMLConfig.service);

    // PlantUML doesn't work with dashes
    appName = appName.replace("-", "_");
    services = services.map(key => key.replace("-", "_"));

    return {
        appName: appName,
        services: services
    };

}

const handlePropertiesConfig = (serviceName) => {

    let parsedPropertiesConfig = propertiesReader(`./Repos/${serviceName}/src/main/resources/application.properties`);

    // Filter root- and connected services --> application.properties
    let appName = parsedPropertiesConfig.path().spring.application.name;
    let services = Object.keys(parsedPropertiesConfig.path().service);

    // PlantUML doesn't work with dashes
    appName = appName.replace("-", "_");
    services = services.map(key => key.replace("-", "_"));

    return {
        appName: appName,
        services: services
    };

}

const getServiceConfig = (serviceName) => {
   
    const fileType = getConfigFileType(serviceName); // .yml or .properties

    if(!fileType) throw new Error("Missing or wrong config-file"); // Ok?

    if(fileType == "yml") return handleYmlConfig(serviceName);

    if(fileType == "properties") return handlePropertiesConfig(serviceName);

}

const createServiceMapping = (serviceConfig) => {

    console.log(serviceConfig);

    if (!serviceMap.hasOwnProperty(`${serviceConfig.appName}`)) {
        serviceMap[serviceConfig.appName] = serviceConfig.services
    }

    if (!serviceMap.allServices.includes(serviceConfig.appName)) {
        serviceMap.allServices.push(serviceConfig.appName);
    }

    serviceConfig.services.forEach(s => {
        if(!serviceMap.allServices.includes(s)){
            serviceMap.allServices.push(s)
        }
    })
}

const drawDiagramm = (serviceMap) => {

    console.log(serviceMap);

    let UML = `
skinparam rectangle {
    roundCorner 25
}

legend left
The arrow-structure shows the way the services communicate:

_________ == Synchrone Kommunikation 
- - - - -  == Asynchrone Kommunikation

endlegend
\n`

    // Add a reactangle for every Service
    serviceMap.allServices.forEach(k => UML += `rectangle ${k}\n`);

    // Iterate over services of the rootservices Add an arrow between them
    // | rootservice -X-> service1 | rootservice -X-> service2 | ...
    // Add the connections for every Service
    Object.keys(serviceMap)
        .filter(k => k !== "allServices")
        .forEach((k, i) => {
            UML += `${serviceMap[k].map(s => `${k} -up-> ${s}\n`)}`.replace(/,/g, ''); 
        });

    console.log(UML);

    var gen = plantuml.generate(UML);
    gen.out.pipe(fs.createWriteStream("Verhaltenssicht.png"))
}

// --------------------- Asynchronous Communication ---------------------------------

const asynchServices = () => {
   

    // let rawYMLConfig = fs.readFileSync(`./Repos/Waiputhek/deploy/main.tf`, 'utf8');
    let rawYMLConfig = propertiesReader(`./Repos/Waiputhek/deploy/main.tf`);
    console.log(rawYMLConfig);

}


try {

    let whiteList = getServicesWhiteList();
    whiteList.forEach(service => createServiceMapping(getServiceConfig(service)));
    
    drawDiagramm(serviceMap);
    
    asynchServices();

} catch (e) {

    console.log(e);

}