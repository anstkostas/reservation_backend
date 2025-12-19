const createReservationInputDTO = ({ date, time, persons, status, restaurantId, customerId }) => ({
  date,
  time,
  persons,
  status: status || "active",
  restaurantId,
  customerId
});

const updateReservationInputDTO = (data) => {
  const dto = {};
  if (data.date !== undefined) dto.date = data.date;
  if (data.time !== undefined) dto.time = data.time;
  if (data.persons !== undefined) dto.persons = data.persons;
  if (data.status !== undefined) dto.status = data.status;
  if (data.restaurantId !== undefined) dto.restaurantId = data.restaurantId;
  if (data.customerId !== undefined) dto.customerId = data.customerId;
  return dto;
};

const reservationOutputDTO = ({ id, date, time, persons, status, restaurantId, customerId }) => ({
  id,
  date,
  time,
  persons,
  status,
  restaurantId,
  customerId
});

module.exports = {
  createReservationInputDTO,
  updateReservationInputDTO,
  reservationOutputDTO
};
