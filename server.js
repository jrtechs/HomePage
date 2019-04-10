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

app.get('/activities', (request, result)=>
{
    queryAPI(result, 'https://api.fitbit.com/1/user/-/activities/date/1M.json').then((data)=>
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


app.get('/', (request, result) =>
{
    result.write(utils.getFile("index.html"));
    result.end();
});

app.listen(config.port, () =>
    console.log(`App listening on port ${config.port}!`)
);