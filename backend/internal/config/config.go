package config

type Config struct {
	DSN       string `short:"d" long:"dsn" env:"DSN"  description:"Database connection string" default:"postgresql://postgres:postgres@localhost:5432/template1?sslmode=disable&timeout=5s"`
	Port      int    `short:"p" long:"port" env:"PORT" description:"Port number for the server" default:"8080"`
	RateLimit int    `short:"r" long:"rate-limit" env:"RATE_LIMIT" description:"Rate limit for the server" default:"100"`
	Verbose   []bool `short:"v" long:"verbose" description:"Enable verbose output (can be specified multiple times)"`
}
