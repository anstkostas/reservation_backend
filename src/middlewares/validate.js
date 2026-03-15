// used like this:
// property -> "body", "params", "query"!
// router.post("/", validate(createUserSchema), userController.createUser);
// for startes I will need to validate only req.body hence the missing 2nd param above
const { ValidationError } = require("../errors");

// later I would need to validate url params
module.exports = {
  validate(schema, property = "body") {
    return (req, res, next) => {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        throw new ValidationError(
          "Validation failed",
          error.details.map((d) => d.message)
        );
      }
      req[property] = value;
      next();
    };
  },
};
