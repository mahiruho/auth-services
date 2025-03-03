'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */
    await queryInterface.bulkInsert("FailedLogins", [
      {
        id: Sequelize.literal("uuid_generate_v4()"),
        email: "demo@thinkmirai.com",
        attempt_time: new Date(),
        ip_address: "192.168.1.2",
        device: "Firefox Browser",
        reason: "Incorrect Password",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete("FailedLogins", null, {});
  }
};
