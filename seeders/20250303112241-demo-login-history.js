'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */
    const user = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE email='demo@thinkmirai.com'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    await queryInterface.bulkInsert("LoginHistories", [
      {
        id: Sequelize.literal("uuid_generate_v4()"),
        user_id: user[0].id,
        login_time: new Date(),
        ip_address: "192.168.1.1",
        device: "Chrome Browser",
        location: "New York, USA",
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
    await queryInterface.bulkDelete("LoginHistories", null, {});
  }
};
