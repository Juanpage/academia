FROM php:8.2-apache

RUN echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/80-retries

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpng-dev \
        libjpeg-dev \
        libfreetype6-dev \
        libzip-dev \
        libxml2-dev \
        libicu-dev \
        libpq-dev \
        libonig-dev \
        curl \
        unzip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd

RUN docker-php-ext-install pdo_pgsql
RUN docker-php-ext-install pgsql
RUN docker-php-ext-install intl
RUN docker-php-ext-install zip
RUN docker-php-ext-install soap
RUN docker-php-ext-install mbstring
RUN docker-php-ext-install exif
RUN docker-php-ext-install bcmath

RUN { \
    echo "max_input_vars = 5000"; \
    echo "post_max_size = 128M"; \
    echo "upload_max_filesize = 128M"; \
    echo "max_execution_time = 300"; \
    echo "memory_limit = 256M"; \
    echo "opcache.enable = 1"; \
} > /usr/local/etc/php/conf.d/moodle.ini

RUN curl -fsSL https://github.com/moodle/moodle/archive/refs/tags/v4.3.0.tar.gz \
        -o /tmp/moodle.tar.gz \
    && tar -xzf /tmp/moodle.tar.gz -C /tmp \
    && mv /tmp/moodle-4.3.0 /var/www/moodle \
    && rm /tmp/moodle.tar.gz \
    && chown -R www-data:www-data /var/www/moodle

RUN sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/moodle|g' \
        /etc/apache2/sites-enabled/000-default.conf \
    && sed -i 's|/var/www/html|/var/www/moodle|g' \
        /etc/apache2/apache2.conf \
    && a2enmod rewrite

RUN mkdir -p /var/moodledata \
    && chown -R www-data:www-data /var/moodledata \
    && chmod 777 /var/moodledata

COPY setup-webservice.php /usr/local/bin/setup-webservice.php
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]