# I-Gym Monitor Daemon — Makefile

CC      = gcc
TARGET  = igym_monitor
SRC     = monitor.c
CFLAGS  = -Wall -Wextra -O2 -std=c99
LIBS    = -lmysqlclient -lpthread

# Détection automatique du chemin MySQL (macOS Homebrew / Linux / mysql_config)
MYSQL_PREFIX := $(shell brew --prefix mysql@8.0 2>/dev/null || brew --prefix mysql-client 2>/dev/null || echo "")
ifneq ($(MYSQL_PREFIX),)
MYSQL_INC := -I$(MYSQL_PREFIX)/include
MYSQL_LIB := -L$(MYSQL_PREFIX)/lib -lmysqlclient
else
MYSQL_INC := $(shell mysql_config --include 2>/dev/null || echo "-I/usr/include/mysql")
MYSQL_LIB := $(shell mysql_config --libs 2>/dev/null || echo "-L/usr/lib -lmysqlclient")
endif

all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) $(MYSQL_INC) -o $@ $< $(MYSQL_LIB)
	@echo "✅ Compilation réussie : ./$(TARGET)"

clean:
	rm -f $(TARGET)

install: $(TARGET)
	cp $(TARGET) /usr/local/bin/$(TARGET)
	cp igym.service /etc/systemd/system/
	systemctl daemon-reload
	systemctl enable igym
	@echo "✅ Service systemd installé"

.PHONY: all clean install
