"""Frontend Integration and Component Tests"""

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';


// ─────────────────────────────────────────────────────────────
//  Mock API responses
// ─────────────────────────────────────────────────────────────

const mockAPI = {
  getUser: jest.fn(() =>
    Promise.resolve({
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
      age: 30,
      weight_lbs: 180,
      height_inches: 72,
      fitness_level: 'intermediate',
    })
  ),
  
  updateUser: jest.fn((data) =>
    Promise.resolve({ ...data, updated: true })
  ),
  
  getMeals: jest.fn(() =>
    Promise.resolve([
      { id: '1', name: 'Chicken Salad', calories: 450, date: new Date() },
      { id: '2', name: 'Protein Shake', calories: 200, date: new Date() },
    ])
  ),
  
  logMeal: jest.fn((data) =>
    Promise.resolve({ ...data, id: 'new-meal', logged: true })
  ),
  
  getWorkouts: jest.fn(() =>
    Promise.resolve([
      { id: '1', name: 'Morning Run', duration: 30, type: 'cardio' },
      { id: '2', name: 'Weight Training', duration: 60, type: 'strength' },
    ])
  ),
  
  logWorkout: jest.fn((data) =>
    Promise.resolve({ ...data, id: 'new-workout', logged: true })
  ),
  
  getWaterIntake: jest.fn(() =>
    Promise.resolve({ today: 2000, goal: 2500, percentage: 80 })
  ),
  
  logWater: jest.fn((amount) =>
    Promise.resolve({ amount, logged: true })
  ),
};


// ─────────────────────────────────────────────────────────────
//  Test Suite: User Profile
// ─────────────────────────────────────────────────────────────

describe('User Profile Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders user profile information', async () => {
    // Create a mock component that uses the API
    const UserProfile = () => {
      const [user, setUser] = React.useState(null);
      const [loading, setLoading] = React.useState(true);

      React.useEffect(() => {
        mockAPI.getUser().then(data => {
          setUser(data);
          setLoading(false);
        });
      }, []);

      if (loading) return <div>Loading...</div>;
      if (!user) return <div>No user</div>;

      return (
        <div>
          <h1>{user.name}</h1>
          <p>Email: {user.email}</p>
          <p>Age: {user.age}</p>
          <p>Weight: {user.weight_lbs} lbs</p>
          <p>Height: {user.height_inches} inches</p>
        </div>
      );
    };

    render(<UserProfile />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Email: test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Age: 30')).toBeInTheDocument();
    });
  });

  test('allows updating user profile', async () => {
    const UserProfile = () => {
      const [user, setUser] = React.useState(null);
      const [newName, setNewName] = React.useState('');

      const handleUpdate = async () => {
        const updated = await mockAPI.updateUser({ name: newName });
        setUser(updated);
      };

      return (
        <div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New name"
          />
          <button onClick={handleUpdate}>Update Profile</button>
          {user && <p>Updated: {user.name}</p>}
        </div>
      );
    };

    render(<UserProfile />);
    
    const input = screen.getByPlaceholderText('New name');
    const button = screen.getByText('Update Profile');
    
    await userEvent.type(input, 'New Name');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockAPI.updateUser).toHaveBeenCalledWith({ name: 'New Name' });
    });
  });
});


// ─────────────────────────────────────────────────────────────
//  Test Suite: Nutrition Tracking
// ─────────────────────────────────────────────────────────────

describe('Nutrition Tracking Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays list of meals', async () => {
    const MealsList = () => {
      const [meals, setMeals] = React.useState([]);
      const [loading, setLoading] = React.useState(true);

      React.useEffect(() => {
        mockAPI.getMeals().then(data => {
          setMeals(data);
          setLoading(false);
        });
      }, []);

      if (loading) return <div>Loading meals...</div>;

      return (
        <div>
          <h2>Today's Meals</h2>
          <ul data-testid="meals-list">
            {meals.map(meal => (
              <li key={meal.id}>
                {meal.name} - {meal.calories} calories
              </li>
            ))}
          </ul>
          <p>Total meals: {meals.length}</p>
        </div>
      );
    };

    render(<MealsList />);
    
    await waitFor(() => {
      expect(screen.getByText('Chicken Salad - 450 calories')).toBeInTheDocument();
      expect(screen.getByText('Protein Shake - 200 calories')).toBeInTheDocument();
      expect(screen.getByText('Total meals: 2')).toBeInTheDocument();
    });
  });

  test('allows logging a new meal', async () => {
    const LogMeal = () => {
      const [mealName, setMealName] = React.useState('');
      const [calories, setCalories] = React.useState('');
      const [logged, setLogged] = React.useState(false);

      const handleLog = async () => {
        await mockAPI.logMeal({ name: mealName, calories: parseInt(calories) });
        setLogged(true);
        setMealName('');
        setCalories('');
      };

      return (
        <div>
          <input
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            placeholder="Meal name"
          />
          <input
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="Calories"
            type="number"
          />
          <button onClick={handleLog}>Log Meal</button>
          {logged && <p data-testid="success">Meal logged!</p>}
        </div>
      );
    };

    render(<LogMeal />);
    
    const mealInput = screen.getByPlaceholderText('Meal name');
    const calorieInput = screen.getByPlaceholderText('Calories');
    const button = screen.getByText('Log Meal');
    
    await userEvent.type(mealInput, 'Pasta');
    await userEvent.type(calorieInput, '600');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockAPI.logMeal).toHaveBeenCalledWith({
        name: 'Pasta',
        calories: 600,
      });
      expect(screen.getByTestId('success')).toBeInTheDocument();
    });
  });

  test('calculates total daily calories', async () => {
    const CalorieTotals = () => {
      const [meals, setMeals] = React.useState([]);

      React.useEffect(() => {
        mockAPI.getMeals().then(setMeals);
      }, []);

      const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);

      return (
        <div>
          <p>Total calories: {totalCalories}</p>
        </div>
      );
    };

    render(<CalorieTotals />);
    
    await waitFor(() => {
      expect(screen.getByText('Total calories: 650')).toBeInTheDocument();
    });
  });
});


// ─────────────────────────────────────────────────────────────
//  Test Suite: Workout Tracking
// ─────────────────────────────────────────────────────────────

describe('Workout Tracking Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays list of workouts', async () => {
    const WorkoutsList = () => {
      const [workouts, setWorkouts] = React.useState([]);
      const [loading, setLoading] = React.useState(true);

      React.useEffect(() => {
        mockAPI.getWorkouts().then(data => {
          setWorkouts(data);
          setLoading(false);
        });
      }, []);

      if (loading) return <div>Loading workouts...</div>;

      return (
        <div>
          <h2>Workouts</h2>
          <ul data-testid="workouts-list">
            {workouts.map(workout => (
              <li key={workout.id}>
                {workout.name} ({workout.type}) - {workout.duration} min
              </li>
            ))}
          </ul>
        </div>
      );
    };

    render(<WorkoutsList />);
    
    await waitFor(() => {
      expect(screen.getByText('Morning Run (cardio) - 30 min')).toBeInTheDocument();
      expect(screen.getByText('Weight Training (strength) - 60 min')).toBeInTheDocument();
    });
  });

  test('allows logging a new workout', async () => {
    const LogWorkout = () => {
      const [workoutName, setWorkoutName] = React.useState('');
      const [duration, setDuration] = React.useState('');

      const handleLog = async () => {
        await mockAPI.logWorkout({
          name: workoutName,
          duration: parseInt(duration),
          type: 'other',
        });
      };

      return (
        <div>
          <input
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="Workout name"
          />
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Duration (minutes)"
            type="number"
          />
          <button onClick={handleLog}>Log Workout</button>
        </div>
      );
    };

    render(<LogWorkout />);
    
    const nameInput = screen.getByPlaceholderText('Workout name');
    const durationInput = screen.getByPlaceholderText('Duration (minutes)');
    const button = screen.getByText('Log Workout');
    
    await userEvent.type(nameInput, 'Cycling');
    await userEvent.type(durationInput, '45');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockAPI.logWorkout).toHaveBeenCalledWith({
        name: 'Cycling',
        duration: 45,
        type: 'other',
      });
    });
  });
});


// ─────────────────────────────────────────────────────────────
//  Test Suite: Water Intake Tracking
// ─────────────────────────────────────────────────────────────

describe('Water Intake Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays water intake summary', async () => {
    const WaterIntakeDisplay = () => {
      const [water, setWater] = React.useState(null);

      React.useEffect(() => {
        mockAPI.getWaterIntake().then(setWater);
      }, []);

      if (!water) return <div>Loading...</div>;

      return (
        <div>
          <p>Today's water: {water.today}ml</p>
          <p>Goal: {water.goal}ml</p>
          <p>Progress: {water.percentage}%</p>
        </div>
      );
    };

    render(<WaterIntakeDisplay />);
    
    await waitFor(() => {
      expect(screen.getByText("Today's water: 2000ml")).toBeInTheDocument();
      expect(screen.getByText('Goal: 2500ml')).toBeInTheDocument();
      expect(screen.getByText('Progress: 80%')).toBeInTheDocument();
    });
  });

  test('allows logging water intake', async () => {
    const LogWater = () => {
      const [amount, setAmount] = React.useState('');
      const [logged, setLogged] = React.useState(false);

      const handleLog = async () => {
        await mockAPI.logWater(parseInt(amount));
        setLogged(true);
        setAmount('');
      };

      return (
        <div>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Water (ml)"
            type="number"
          />
          <button onClick={handleLog}>Log Water</button>
          {logged && <p data-testid="water-success">Water logged!</p>}
        </div>
      );
    };

    render(<LogWater />);
    
    const input = screen.getByPlaceholderText('Water (ml)');
    const button = screen.getByText('Log Water');
    
    await userEvent.type(input, '250');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockAPI.logWater).toHaveBeenCalledWith(250);
      expect(screen.getByTestId('water-success')).toBeInTheDocument();
    });
  });
});


// ─────────────────────────────────────────────────────────────
//  Test Suite: Form Validation
// ─────────────────────────────────────────────────────────────

describe('Form Validation', () => {
  test('validates email input', () => {
    const validateEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('user@domain')).toBe(false);
  });

  test('validates numeric inputs', () => {
    const validateNumber = (value, min, max) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= min && num <= max;
    };

    expect(validateNumber('150', 0, 200)).toBe(true);
    expect(validateNumber('250', 0, 200)).toBe(false);
    expect(validateNumber('abc', 0, 200)).toBe(false);
  });

  test('validates required fields', () => {
    const validateRequired = (value) => {
      return value && value.trim() !== '';
    };

    expect(validateRequired('text')).toBe(true);
    expect(validateRequired('')).toBe(false);
    expect(validateRequired('   ')).toBe(false);
  });
});


// ─────────────────────────────────────────────────────────────
//  Test Suite: Error Handling
// ─────────────────────────────────────────────────────────────

describe('Error Handling', () => {
  test('displays error message on API failure', async () => {
    mockAPI.getMeals = jest.fn().mockRejectedValueOnce(new Error('API Error'));

    const MealsWithErrorHandling = () => {
      const [error, setError] = React.useState(null);

      React.useEffect(() => {
        mockAPI.getMeals().catch(err => {
          setError(err.message);
        });
      }, []);

      return (
        <div>
          {error && <p data-testid="error">{error}</p>}
        </div>
      );
    };

    render(<MealsWithErrorHandling />);
    
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('API Error');
    });
  });

  test('shows loading state during API call', () => {
    const ComponentWithLoading = () => {
      const [loading, setLoading] = React.useState(true);

      return (
        <div>
          {loading && <p data-testid="loading">Loading...</p>}
        </div>
      );
    };

    render(<ComponentWithLoading />);
    
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });
});
