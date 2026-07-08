@echo off
REM Quick Test Runner Script for Health Fitness Coach (Windows)
REM Usage: run-tests.bat [test-type]

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════╗
echo ║  Health Fitness Coach - Test Runner Suite          ║
echo ║  Windows Edition                                   ║
echo ╚════════════════════════════════════════════════════╝
echo.

REM Check if test type is provided
if "%1"=="" (
    set TEST_TYPE=all
) else (
    set TEST_TYPE=%1
)

REM Check if help is requested
if "%TEST_TYPE%"=="--help" goto :show_help
if "%TEST_TYPE%"=="-h" goto :show_help

echo Test Type: %TEST_TYPE%
echo.

REM Run backend tests
if "%TEST_TYPE%"=="all" goto :run_all
if "%TEST_TYPE%"=="quick" goto :run_quick
if "%TEST_TYPE%"=="coverage" goto :run_coverage
if "%TEST_TYPE%"=="auth" goto :run_auth
if "%TEST_TYPE%"=="api" goto :run_api
if "%TEST_TYPE%"=="models" goto :run_models
if "%TEST_TYPE%"=="integration" goto :run_integration

echo Unknown test type: %TEST_TYPE%
echo Available: all, quick, coverage, auth, api, models, integration
exit /b 1

:run_all
echo ► Running All Tests...
cd backend
echo Running backend tests...
pytest -v --tb=short
if errorlevel 1 goto :backend_failed
cd ..\frontend
echo Running frontend tests...
npm test -- --passWithNoTests
if errorlevel 1 goto :frontend_failed
goto :success

:run_quick
echo ► Running Quick Tests...
cd backend
echo Running backend tests...
pytest -v --tb=short -x
if errorlevel 1 goto :backend_failed
cd ..\frontend
echo Running frontend tests...
npm test -- --passWithNoTests --maxWorkers=1
if errorlevel 1 goto :frontend_failed
goto :success

:run_coverage
echo ► Running Tests with Coverage...
cd backend
echo Running backend tests with coverage...
pytest --cov=. --cov-report=html --cov-report=term-missing
echo Coverage report generated: htmlcov/index.html
if errorlevel 1 goto :backend_failed
cd ..\frontend
echo Running frontend tests with coverage...
npm test -- --coverage --passWithNoTests
echo Coverage report generated: coverage/index.html
if errorlevel 1 goto :frontend_failed
goto :success

:run_auth
echo ► Running Authentication Tests...
cd backend
pytest tests/test_auth.py -v
cd ..
goto :success

:run_api
echo ► Running API Endpoint Tests...
cd backend
pytest tests/test_api_endpoints.py -v
cd ..
goto :success

:run_models
echo ► Running Model Tests...
cd backend
pytest tests/test_models.py -v
cd ..
goto :success

:run_integration
echo ► Running Integration Tests...
cd backend
pytest tests/test_integration.py -v
cd ..
goto :success

:backend_failed
echo.
echo ✗ Backend tests failed!
cd ..
exit /b 1

:frontend_failed
echo.
echo ✗ Frontend tests failed!
cd ..
exit /b 1

:success
echo.
echo ╔════════════════════════════════════════════════════╗
echo ║  Test Run Summary                                  ║
echo ║  ✓ All tests completed successfully!              ║
echo ╚════════════════════════════════════════════════════╝
cd ..
exit /b 0

:show_help
echo.
echo Usage: run-tests.bat [test-type]
echo.
echo Test Types:
echo   all           Run all tests (backend + frontend)
echo   quick         Run quick tests (stop on first failure)
echo   coverage      Generate coverage reports
echo   auth          Backend authentication tests only
echo   api           Backend API endpoint tests only
echo   models        Backend database model tests only
echo   integration   Backend integration tests only
echo.
echo Examples:
echo   run-tests.bat all              # Run all tests
echo   run-tests.bat quick            # Quick test run
echo   run-tests.bat coverage         # With coverage report
echo   run-tests.bat auth             # Auth tests only
echo.
exit /b 0
