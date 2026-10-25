// SQL Server error numbers we translate into friendly HTTP errors
const SQL_ERRORS = {
  UNIQUE_CONSTRAINT: 2627, // violation of a UNIQUE / PRIMARY KEY constraint
  UNIQUE_INDEX: 2601,      // duplicate key in a unique index
};

function isDuplicateKey(err) {
  return err.number === SQL_ERRORS.UNIQUE_CONSTRAINT || err.number === SQL_ERRORS.UNIQUE_INDEX;
}

module.exports = { isDuplicateKey };
