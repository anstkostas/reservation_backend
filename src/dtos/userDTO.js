// Object Literal Pattern
module.exports = {
  createUserInputDTO(data) {
    return {
      firstname: data.firstname?.trim(),
      lastname: data.lastname?.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password, // NOTE service layer will hash
      restaurantId: data.restaurantId || null,
    };
  },

  userOutputDTO(user) {
    return {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
    };
  },
};
