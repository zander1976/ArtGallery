<?php

class CacheHandler
{
    private array $cache = [];
    //private $memcache;

    public function __construct()
    {
        //$this->memcache = new Memcache();
        //$this->memcache->connect("kunz-pc.sce.carleton.ca", 11211) or die("Could not connect");
    }

    public function __destruct()
    {
        //$this->memcache->close();
    }

    public function set(string $key, mixed $value): void
    {
        $this->cache[$key] = $value;
        //$this->memcache->set($key, $value, 0, 3600);
    }

    public function get(string $key): mixed
    {
        return $this->cache[$key] ?? null; 
        //return $this->memcache->get($key) ?? null;
    }

    public function has(string $key): bool
    {
        return isset($this->cache[$key]);
        //return $this->memcache->get($key) !== false
    }

    public function delete(string $key): void
    {
        unset($this->cache[$key]);
        //$this->memcache->delete($key);
    }

    public function clear(): void
    {
        $this->cache = [];
        //$this->memcache->flush();
    }
}
?>