release: python manage.py migrate
web: gunicorn eldtracker.wsgi:application --bind 0.0.0.0:$PORT
