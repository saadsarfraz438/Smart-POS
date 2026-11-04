FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY Volta.sln ./
COPY src/Volta.Api/Volta.Api.csproj src/Volta.Api/
COPY src/Volta.Core/Volta.Core.csproj src/Volta.Core/
COPY src/Volta.Infrastructure/Volta.Infrastructure.csproj src/Volta.Infrastructure/
COPY src/Volta.Tests/Volta.Tests.csproj src/Volta.Tests/
RUN dotnet restore
COPY . .
RUN dotnet publish src/Volta.Api -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "Volta.Api.dll"]
