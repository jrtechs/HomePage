/** express app */
const express = require("express");

/** Manages oauth 2.0 w/ fitbit */
const passport = require('passport');

/** Used to make API calls */
const unirest = require('unirest');

/** express app */
const app = express();

/** pull config file */
const utils = require("./utils.js");
const config = utils.getFileAsJSON("config.json");


app.use(passport.initialize());
app.use(passport.session({
    resave: false,
    saveUninitialized: true
}));


var FitbitStrategy = require( 'passport-fitbit-oauth2' ).FitbitOAuth2Strategy;


var accessTokenTemp = null;
passport.use(new FitbitStrategy({
        clientID:     config.clientID,
        clientSecret: config.clientSecret,
        callbackURL: config.callbackURL
    },
    function(accessToken, refreshToken, profile, done)
    {
        console.log(accessToken);
        accessTokenTemp = accessToken;
        done(null, {
            accessToken: accessToken,
            refreshToken: refreshToken,
            profile: profile
        });
    }
));

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});


passport.authenticate('fitbit', { scope: ['activity','heartrate','location','profile'] });

app.get('/auth/fitbit',
    passport.authenticate('fitbit', { scope: ['activity','heartrate','location','profile'] }
));

app.get( '/auth/fitbit/callback', passport.authenticate( 'fitbit', {
    successRedirect: '/',
    failureRedirect: '/error'
}));


app.get('/error', (request, result) =>
{
    result.write("Error authenticating with Fitbit API");
    result.end();
});


const queryAPI = function(result, path)
{
    return new Promise((resolve, reject)=>
    {
        if(accessTokenTemp == null)
        {
            result.redirect('/auth/fitbit');
            resolve(false);
        }

        unirest.get(path)
            .headers({'Accept': 'application/json', 'Content-Type': 'application/json', Authorization: "Bearer " +  accessTokenTemp})
            .end(function (response)
            {
                if(response.hasOwnProperty("success") && response.success == false)
                {
                    result.redirect('/auth/fitbit');
                    resolve(false);
                }
                resolve(response.body);
            });
    });
};

app.get('/steps', (request, result)=>
{
    queryAPI(result, 'https://api.fitbit.com/1/user/-/activities/tracker/steps/date/today/1m.json').then((data)=>
    {
        if(data != false)
        {
            result.writeHead(200, {'Content-Type': 'text/html'});
            result.write(JSON.stringify(data));
            result.end();
        }
        else
        {
            console.log("Validating with API");
        }
    });
});


//2021-06-01T00:00:00

app.get('/list-activities/:startTime', (request, result)=>
{
    var startTime = request.params.startTime;

    fetchActivities(result, startTime).then((data)=>
    {
        result.writeHead(200, {'Content-Type': 'text/json'});
        result.write(JSON.stringify(data));
        result.end();
    }).catch((error)=>
    {
        console.log(error);
        result.writeHead(500, {'Content-Type': 'text/json'});
        result.end();
    });
});


function fetchActivities(result, startTime)
{
    return new Promise((resolve, reject)=>
    {
        queryAPI(result, 'https://api.fitbit.com/1/user/-/activities/list.json?beforeDate=' + startTime + '&sort=desc&offset=0&limit=100').then((data)=>
        {
            if(data != false)
            {
                resolve(data.activities);
            }
            reject("Error with API, are you authenticated")
        });
    });
}

//2021-06-01T00:00:00
//2020-04-06T17:16:19.000-04:00
function fetchAllRuns(result, startTime)
{
    var runs = [];
    console.log(startTime);
    return new Promise((resolve, reject)=>
    {
        fetchActivities(result, startTime).then((events)=>
        {
            if(events.length < 10)
            {
                resolve(runs);
            }
            else
            {
                for(var i = 0; i < events.length; i++)
                {
                    if(events[i].logType === "mobile_run")
                    {
                        console.log(events[i]);
                        runs.push(events[i]);
                    }
                }
                var newStart = events[events.length -1].startTime.slice(0, -10);
                fetchAllRuns(result, newStart).then((run_rec)=>
                {
                    resolve(runs.concat(run_rec));
                }).catch((err)=>
                {
                    reject(err);
                });
            }
        }).catch((error)=>
        {
            reject(error);
        });
    });
}



//2021-06-01T00:00:00
app.get('/all-logged-runs', (request, result)=>
{
    var startTime = '2030-06-01T00:00:00';

    fetchAllRuns(result, startTime).then((data)=>
    {
        result.writeHead(200, {'Content-Type': 'text/json'});
        result.write(JSON.stringify(data));
        result.end();
    }).catch((error)=>
    {
        console.log(error);
        result.writeHead(500, {'Content-Type': 'text/json'});
        result.end();
    });
});



app.get('/activities', (request, result)=>
{
    queryAPI(result, 'https://api.fitbit.com/1/user/-/activities/recent.json').then((data)=>
    {
        if(data != false)
        {
            result.writeHead(200, {'Content-Type': 'text/html'});
            result.write(JSON.stringify(data));
            result.end();
        }
        else
        {
            console.log("Validating with API");
        }
    });
});


function fetchTCX(result, tcxID)
{
    console.log("Fetching tcx event: " + tcxID);
    return new Promise((resolve, reject)=>
    {
        queryAPI(result, 'https://api.fitbit.com/1/user/-/activities/' + tcxID + ".tcx").then((data)=>
        {
            if(data != false)
            {
                resolve(data);
            }
            reject("Error with API, are you authenticated")
        });
    });
}


function saveTCX(result, tcxID)
{
    return new Promise((resolve, reject)=>
    {
        fetchTCX(result, tcxID).then((tcx)=>
        {
            utils.saveFile(tcxID + ".tcx", tcx);
            resolve();
        }).catch((err)=>
        {
            reject(err);
        })
    });
}


app.get('/save-all-tcx', (request, result)=>
{
    var tcxID = request.params.id;

    var startTime = '2030-06-01T00:00:00';

    fetchAllRuns(result, startTime).then((data)=>
    {
        var promises = [];
        for(var i =0; i < data.length; i++)
        {
            promises.push(saveTCX(result, data[i].logId));
        }
        Promise.all(promises).then(function(content)
        {
            result.write("All events saved");
            result.end();
        }).catch(function(err)
        {
            console.log(err);
            throw err;
        });
    }).catch((error)=>
    {
        console.log(error);
        result.writeHead(500, {'Content-Type': 'text/json'});
        result.end();
    });
});


app.get('/tcx/:id', (request, result)=>
{
    var tcxID = request.params.id;

    fetchTCX(result, tcxID).then((data)=>
    {
        result.writeHead(200, {'Content-Type': 'text/xml'});
        result.write(data);
        result.end();
    }).catch((error)=>
    {
        console.log(error);
        result.writeHead(500, {'Content-Type': 'text/json'});
        result.end();
    });

});


app.get('/', (request, result) =>
{
    result.write(utils.getFile("index.html"));
    result.end();
});

app.listen(config.port, () =>
    console.log(`App listening on port ${config.port}!`)
);

app.use(express.static('public'));