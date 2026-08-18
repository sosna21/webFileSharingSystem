FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

# Install Node.js and npm
RUN apt-get update \
    && apt-get install -y curl ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && npm --version \
    && node --version \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src

COPY src/webFileSharingSystem.Core/webFileSharingSystem.Core.csproj \
     src/webFileSharingSystem.Core/

COPY src/webFileSharingSystem.Infrastructure/webFileSharingSystem.Infrastructure.csproj \
     src/webFileSharingSystem.Infrastructure/

COPY src/webFileSharingSystem.Web/webFileSharingSystem.Web.csproj \
     src/webFileSharingSystem.Web/

RUN dotnet restore src/webFileSharingSystem.Web/webFileSharingSystem.Web.csproj

COPY src/ src/

RUN dotnet publish src/webFileSharingSystem.Web/webFileSharingSystem.Web.csproj \
    -c Release \
    -o /app/publish


FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final

WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "webFileSharingSystem.Web.dll"]