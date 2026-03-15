// Usage: validate(schema, property)
// property -> "body" (default), "params", "query"
// router.post("/", validate(createUserSchema), userController.createUser);
const { ValidationError } = require("../errors");

module.exports = {
  validate(schema, property = "body") {
    return (req, _res, next) => {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        return next(
          new ValidationError(
            "Validation failed",
            error.details.map((d) => d.message)
          )
        );
      }
      req[property] = value;
      next();
    };
  },
};
