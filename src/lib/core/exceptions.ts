// ===================
// Generic
// ===================

class MSWrapperException extends Error {
  constructor(message = "MSWrapper error") {
    super(message);
    this.name = "MSWrapperException";

    Object.setPrototypeOf(this, MSWrapperException.prototype);
  }
}

// ===================
// Specific
// ===================

class MVSException extends Error {
  constructor(message = "MVS error") {
    super(message);
    this.name = "MVSException";

    Object.setPrototypeOf(this, MVSException.prototype);
  }
}

export { MSWrapperException, MVSException };
