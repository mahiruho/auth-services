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
    const user = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE email='demo@thinkmirai.com'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    await queryInterface.bulkInsert("RedirectLogs", [
      {
        id: Sequelize.literal("uuid_generate_v4()"),
        user_id: user[0].id,
        app_name: "Client App 1",
        redirect_url: "https://clientapp1.com/dashboard",
        timestamp: new Date(),
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
    await queryInterface.bulkDelete("RedirectLogs", null, {});
  }
};
