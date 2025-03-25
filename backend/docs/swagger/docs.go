// Code generated by swaggo/swag. DO NOT EDIT.

package swagger

import "github.com/swaggo/swag"

const docTemplate = `{
    "schemes": {{ marshal .Schemes }},
    "swagger": "2.0",
    "info": {
        "description": "{{escape .Description}}",
        "title": "{{.Title}}",
        "contact": {},
        "version": "{{.Version}}"
    },
    "host": "{{.Host}}",
    "basePath": "{{.BasePath}}",
    "paths": {
        "/users": {
            "get": {
                "description": "get all users",
                "consumes": [
                    "application/json"
                ],
                "produces": [
                    "application/json"
                ],
                "summary": "List all users",
                "responses": {
                    "200": {
                        "description": "OK",
                        "schema": {
                            "type": "array",
                            "items": {
                                "$ref": "#/definitions/user-management_internal_models.User"
                            }
                        }
                    }
                }
            },
            "post": {
                "description": "create a new user",
                "consumes": [
                    "application/json"
                ],
                "produces": [
                    "application/json"
                ],
                "summary": "Create a user",
                "parameters": [
                    {
                        "description": "User Data",
                        "name": "user",
                        "in": "body",
                        "required": true,
                        "schema": {
                            "$ref": "#/definitions/user-management_internal_models.UserCreateRequest"
                        }
                    }
                ],
                "responses": {
                    "201": {
                        "description": "Created",
                        "schema": {
                            "$ref": "#/definitions/user-management_internal_models.User"
                        }
                    },
                    "400": {
                        "description": "Bad Request",
                        "schema": {
                            "type": "object",
                            "additionalProperties": {
                                "type": "string"
                            }
                        }
                    },
                    "422": {
                        "description": "Unprocessable Entity",
                        "schema": {
                            "type": "object",
                            "additionalProperties": {
                                "type": "string"
                            }
                        }
                    }
                }
            }
        },
        "/users/{id}": {
            "get": {
                "description": "get user by ID",
                "consumes": [
                    "application/json"
                ],
                "produces": [
                    "application/json"
                ],
                "summary": "Get a user",
                "parameters": [
                    {
                        "type": "string",
                        "description": "User ID (int64)",
                        "name": "id",
                        "in": "path",
                        "required": true
                    }
                ],
                "responses": {
                    "200": {
                        "description": "OK",
                        "schema": {
                            "$ref": "#/definitions/user-management_internal_models.User"
                        }
                    },
                    "404": {
                        "description": "Not Found",
                        "schema": {
                            "type": "object",
                            "additionalProperties": {
                                "type": "string"
                            }
                        }
                    }
                }
            },
            "put": {
                "description": "update a user by ID",
                "consumes": [
                    "application/json"
                ],
                "produces": [
                    "application/json"
                ],
                "summary": "Update a user",
                "parameters": [
                    {
                        "type": "string",
                        "description": "User ID (int64)",
                        "name": "id",
                        "in": "path",
                        "required": true
                    },
                    {
                        "description": "User Data",
                        "name": "user",
                        "in": "body",
                        "required": true,
                        "schema": {
                            "$ref": "#/definitions/user-management_internal_models.UserUpdateRequest"
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "OK",
                        "schema": {
                            "$ref": "#/definitions/user-management_internal_models.User"
                        }
                    },
                    "400": {
                        "description": "Bad Request",
                        "schema": {
                            "type": "object",
                            "additionalProperties": {
                                "type": "string"
                            }
                        }
                    },
                    "404": {
                        "description": "Not Found",
                        "schema": {
                            "type": "object",
                            "additionalProperties": {
                                "type": "string"
                            }
                        }
                    },
                    "422": {
                        "description": "Unprocessable Entity",
                        "schema": {
                            "type": "object",
                            "additionalProperties": {
                                "type": "string"
                            }
                        }
                    }
                }
            },
            "delete": {
                "description": "delete a user by ID",
                "consumes": [
                    "application/json"
                ],
                "produces": [
                    "application/json"
                ],
                "summary": "Delete a user",
                "parameters": [
                    {
                        "type": "string",
                        "description": "User ID (int64)",
                        "name": "id",
                        "in": "path",
                        "required": true
                    }
                ],
                "responses": {
                    "204": {
                        "description": "No Content"
                    },
                    "400": {
                        "description": "Bad Request",
                        "schema": {
                            "type": "object",
                            "additionalProperties": {
                                "type": "string"
                            }
                        }
                    }
                }
            }
        }
    },
    "definitions": {
        "user-management_internal_models.User": {
            "type": "object",
            "properties": {
                "createdAt": {
                    "type": "string"
                },
                "department": {
                    "type": "string"
                },
                "email": {
                    "type": "string"
                },
                "firstName": {
                    "type": "string"
                },
                "id": {
                    "type": "integer"
                },
                "lastName": {
                    "type": "string"
                },
                "updatedAt": {
                    "type": "string"
                },
                "userName": {
                    "type": "string"
                },
                "userStatus": {
                    "$ref": "#/definitions/user-management_internal_models.UserStatus"
                }
            }
        },
        "user-management_internal_models.UserCreateRequest": {
            "type": "object",
            "required": [
                "email",
                "firstName",
                "lastName",
                "userName",
                "userStatus"
            ],
            "properties": {
                "department": {
                    "description": "Department the user belongs to, alphanumeric with spaces allowed\nmaxLength: 255\nexample: Engineering",
                    "type": "string",
                    "maxLength": 255
                },
                "email": {
                    "description": "Email address of the user, must be a valid email format\nrequired: true\nmaxLength: 255\nformat: email\nexample: john.doe@example.com",
                    "type": "string",
                    "maxLength": 255
                },
                "firstName": {
                    "description": "The first name of the user, must be provided, minimum 1 character, can have spaces\nrequired: true\nminLength: 1\nmaxLength: 255\npattern: ^[a-zA-Z0-9]+$\nexample: John",
                    "type": "string",
                    "maxLength": 255,
                    "minLength": 1
                },
                "lastName": {
                    "description": "The last name of the user, must be provided, minimum 1 character, can have spaces\nrequired: true\nminLength: 1\nmaxLength: 255\npattern: ^[a-zA-Z0-9]+$\nexample: Doe",
                    "type": "string",
                    "maxLength": 255,
                    "minLength": 1
                },
                "userName": {
                    "description": "The username for the user, must be provided, minimum 4 alphanumeric characters\nrequired: true\nminLength: 4\nmaxLength: 255\npattern: ^[a-zA-Z0-9]+$\nexample: johndoe",
                    "type": "string",
                    "maxLength": 255,
                    "minLength": 4
                },
                "userStatus": {
                    "description": "Status of the user (A=Active, I=Inactive, T=Terminated)\nrequired: true\nenum: A,I,T\nexample: A",
                    "enum": [
                        "A",
                        "I",
                        "T"
                    ],
                    "allOf": [
                        {
                            "$ref": "#/definitions/user-management_internal_models.UserStatus"
                        }
                    ]
                }
            }
        },
        "user-management_internal_models.UserStatus": {
            "type": "string",
            "enum": [
                "A",
                "I",
                "T"
            ],
            "x-enum-varnames": [
                "UserStatusActive",
                "UserStatusInactive",
                "UserStatusTerminated"
            ]
        },
        "user-management_internal_models.UserUpdateRequest": {
            "type": "object",
            "required": [
                "email",
                "firstName",
                "lastName",
                "userName",
                "userStatus"
            ],
            "properties": {
                "department": {
                    "description": "Department the user belongs to, alphanumeric with spaces allowed\nmaxLength: 255\nexample: Engineering",
                    "type": "string",
                    "maxLength": 255
                },
                "email": {
                    "description": "Email address of the user, must be a valid email format\nrequired: true\nmaxLength: 255\nformat: email\nexample: john.doe@example.com",
                    "type": "string",
                    "maxLength": 255
                },
                "firstName": {
                    "description": "The first name of the user, must be provided, minimum 1 character, can have spaces\nrequired: true\nminLength: 1\nmaxLength: 255\npattern: ^[a-zA-Z0-9]+$\nexample: John",
                    "type": "string",
                    "maxLength": 255,
                    "minLength": 1
                },
                "lastName": {
                    "description": "The last name of the user, must be provided, minimum 1 character, can have spaces\nrequired: true\nminLength: 1\nmaxLength: 255\npattern: ^[a-zA-Z0-9]+$\nexample: Doe",
                    "type": "string",
                    "maxLength": 255,
                    "minLength": 1
                },
                "userName": {
                    "description": "The username for the user, must be provided, minimum 4 alphanumeric characters\nrequired: true\nminLength: 4\nmaxLength: 255\npattern: ^[a-zA-Z0-9]+$\nexample: johndoe",
                    "type": "string",
                    "maxLength": 255,
                    "minLength": 4
                },
                "userStatus": {
                    "description": "Status of the user (A=Active, I=Inactive, T=Terminated)\nrequired: true\nenum: A,I,T\nexample: A",
                    "enum": [
                        "A",
                        "I",
                        "T"
                    ],
                    "allOf": [
                        {
                            "$ref": "#/definitions/user-management_internal_models.UserStatus"
                        }
                    ]
                }
            }
        }
    }
}`

// SwaggerInfo holds exported Swagger Info so clients can modify it
var SwaggerInfo = &swag.Spec{
	Version:          "1.0",
	Host:             "localhost:8080",
	BasePath:         "/handlers/v1",
	Schemes:          []string{},
	Title:            "User Management API",
	Description:      "A simple user management API",
	InfoInstanceName: "swagger",
	SwaggerTemplate:  docTemplate,
}

func init() {
	swag.Register(SwaggerInfo.InstanceName(), SwaggerInfo)
}
