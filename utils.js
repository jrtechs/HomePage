
const fs = require('fs');

module.exports=
    {
        /**
         *
         * @param fileName
         * @returns {any}
         */
        getFileAsJSON: function(fileName)
        {
            return JSON.parse(module.exports.getFile(fileName));
        },

        getFile: function(filename)
        {
            return fs.readFileSync(filename,  'utf8');
        }
    };
