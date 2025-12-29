module.exports = {
  createReservationInputDTO(data) {
    return {
      date: data.date,
      time: data.time,
      persons: data.persons || 1,
      // status isnt provided by user
      // customerId from req.user.id(login user-auth)
    };
  },

  updateReservationInputDTO(data) {
    const dto = {};
    if (data.date !== undefined) dto.date = data.date;
    if (data.time !== undefined) dto.time = data.time;
    if (data.persons !== undefined) dto.persons = data.persons;
    // if (data.status !== undefined) dto.status = data.status; // For cancel/complete.
    return dto;
  },

  reservationOutputDTO(dbData) {
    return {
      id: dbData.id,
      date: dbData.date,
      time: dbData.time,
      persons: dbData.persons,
      status: dbData.status,
      restaurantId: dbData.restaurantId,
      customerId: dbData.customerId,
    };
  },
};
