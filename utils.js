
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
        },

        saveFile: function(filename, contents)
        {
            fs.writeFile(filename, contents, function(err)
            {
                if(err)
                {
                    console.log(err);
                }
                else
                {
                    console.log(filename + " saved");
                }
            });
        }
    };
