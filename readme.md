# WebFileSharingSystem Readme

This readme file provides information about the application, including default user credentials and instructions for building and running the application.

## Live demo

To access the live application demo use the following link
<https://filesharingsystemdemo.azurewebsites.net/>

## Default User Credentials

To access the application, you can use the following default user credentials:

- **Username:** Administrator
- **Email:** administrator@localhost
- **Password:** Administrator1!

Please note that it is highly recommended to change the default credentials after the initial login for security reasons.

## Prerequisites

Before building and running the application, ensure that you have the following prerequisites installed:

- **.NET SDK:** Install the .NET SDK version 6.
- **SQL Server:** You will need a SQL Server instance to store and retrieve data for the application. Ensure that you have SQL Server installed and configured properly.
- **Node.js:** The application have frontend dependencies managed with Node.js version 16 and npm.


## Building the Application

To build the application, follow these steps:

1. Ensure that you have the necessary prerequisites installed on your system, including the .NET 6 SDK and any other dependencies mentioned in the project documentation.
2. Clone the repository to your local machine using the following command:

```shell
git clone https://github.com/sosna21/webFileSharingSystem.git
```

3. Navigate to the project directory using the command line or terminal.
4. Run the following command to restore the required packages:

```shell
dotnet restore
```

5. After the packages are successfully restored, build the application using the following command:

```shell
dotnet build
```

## Running the Application

To run the application, follow these steps:

1. Navigate to the project directory in the command line or terminal.
2. Use the following command to start the application:

```shell
dotnet run --project .\src\webFileSharingSystem.Web\webFileSharingSystem.Web.csproj
```

3. After the application is successfully started, you should see output indicating the local development server URL, usually `http://localhost:5000` or `https://localhost:5001`.
4. Open your preferred web browser and navigate to the provided URL to access the application.

Please note that the above steps assume you are running the application in a development environment. For production deployment, refer to the appropriate documentation or guidelines.

## Additional Information

If you need further assistance or encounter any issues with the application, please seek support from the project's maintainers.

Thank you for using our application! We hope you find it useful and enjoy using it.