module.exports = (function(){

  function inl(value){
    var nextVarId = 0;

    return (function normalize(value){
      // This is responsible for collecting the argument list of a bound
      // variable. For example, in `function(x){return x(a,b)(b)(c)}`, it
      // collects `(a,b)`, `(b)`, `(c)` as the arguments of `x`. For
      // that, it creates a variadic argumented function that is applied
      // to many arguments, collecting them in a closure, until it is
      // applied to `null`. When it is, it returns the JS source string
      // for the application of the collected argument list.
      function application(varName, argList){
        var app = function(arg){
          if (arg === null) {
            function stringifyCall(args){
              return "("+args.join(",")+")"
            }
            return varName + (argList.length===0 ? "" : argList.map(stringifyCall).join(""));
          } else {
            var args       = [].slice.call(arguments,0);
            var newArgList = argList.concat([args.map(normalize)]);
            return application(varName, newArgList);
          };
        };
        app.isApplication = true;
        return app;
      };
      // For unit types, we just return.
      if (value === undefined || value === null){
        return value;
      }
      // For unit types, we just delegate to JSON.stringify.
      else if (typeof value === "string"
          ||  typeof value === "number"
          ||  typeof value === "boolean") {
        return JSON.stringify(value);
      }
      // If we try to normalize an application, we apply
      // it to `null` to stop the argument-collecting.
      else if (value.isApplication) {
        return value(null);
      }
      // If it is a function, we need to create an application for its
      // variable, and call the function on it, so its variable can start
      // collecting the argList for the places where it is called on the
      // body.  We then normalize the resulting body and return the JS source
      // for the function.
      else if (typeof value === "function") {
        var argNames = [];
        var argApps  = [];
        for (var i=0, l=value.length; i<l; ++i){
          var argName = toName(nextVarId++);
          var app     = application(argName, []);
          argNames.push(argName);
          argApps.push(app);
        };
        var body = normalize(value.apply(null,argApps));
        return argNames.join(",")+" => "+body;
      }
      // For container types (objects and arrays), it is just a matter
      // of calling stringify on the contained values recursively.
      else if (typeof value === "object") {
        if (value instanceof Array){
          var source = "[";
          for (var i=0, l=value.length; i<l; ++i)
            source += (i?",":"") + normalize(value[i]);
          return source+"]";
        } else if (value instanceof Date){
          return null;
        } else {
          var source = "{";
          var i    = 0;
          for (var key in value)
            source += (i++?",":"") + JSON.stringify(key) + ":" + normalize(value[key]);
          return source+"}";
        };
      }
    })(value);
  };

  // toName :: Number -> String
  // Turns a number into a var name (a, b, c... aa, ab...).
  function toName(nat){
    var alphabet = "abcdefghijklmnopqrstuvwxyz";
    var name = "";
    do {
      name += alphabet[nat % alphabet.length];
      nat = Math.floor(nat / alphabet.length);
    } while (nat > 0);
    return name;
  };

  return inl;

})();
