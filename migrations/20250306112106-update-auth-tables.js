'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'locked_until', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('Users', 'device_sessions', {
      type: Sequelize.JSONB,
      allowNull: true,
    });

    await queryInterface.addColumn('LoginHistories', 'session_id', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      allowNull: false,
      unique: true,
    });

    await queryInterface.addColumn('FailedLogins', 'attempt_count', {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: false,
    });

    await queryInterface.createTable('DeviceSessions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      device: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      ip_address: {
        type: Sequelize.INET,
        allowNull: false,
      },
      login_time: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      last_active: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'locked_until');
    await queryInterface.removeColumn('Users', 'device_sessions');
    await queryInterface.removeColumn('LoginHistories', 'session_id');
    await queryInterface.removeColumn('FailedLogins', 'attempt_count');
    await queryInterface.dropTable('DeviceSessions');
  },
};
