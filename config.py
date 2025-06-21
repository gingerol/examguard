import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Base configuration"""
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/ai_proctor_db')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    PORT = int(os.getenv('PORT', 5000))
    
    # CORS Configuration
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    
    # File uploads
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'DEBUG')

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    FLASK_ENV = 'production'
    LOG_LEVEL = 'INFO'
    
    # Use Railway's MongoDB service
    MONGO_URI = os.getenv('MONGO_PRIVATE_URL', os.getenv('MONGO_URI'))
    
    # Production CORS - more restrictive
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://examguard-frontend.railway.app')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    FLASK_ENV = 'development'

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    FLASK_ENV = 'testing'
    MONGO_URI = 'mongodb://localhost:27017/ai_proctor_test_db'

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config():
    """Get configuration based on FLASK_ENV"""
    env = os.getenv('FLASK_ENV', 'development')
    return config.get(env, config['default'])