<?php 
require_once("CacheHandler.php");
require_once("DatabaseHandler.php");

class GraphQlHandler {
    private DatabaseHandler $databaseConnection;
    private CacheHandler $cacheHandler;

    public function __construct(DatabaseHandler $databaseConnection, CacheHandler $cacheHandler) {
        $this->databaseConnection = $databaseConnection;
        $this->cacheHandler = $cacheHandler;
    }

    public function query(string $query): string {

        if ($this->cacheHandler->has($query)) {
            return $this->cacheHandler->get($query);
        }

        $data = json_decode($query, true);

        if ($data === null) {
            return json_encode(["error" => "Invalid JSON format"]);
        }

        $table = is_array($data['tables']) ? implode(", ", $data['tables']) : $data['tables'];

        if (isset($data['columns'])) { 
            $columns = is_array($data['columns']) ? implode(", ", $data['columns']) : $data['columns'];
            $sql = "SELECT $columns FROM `$table`";
        } else {
            $sql = "SELECT * FROM `$table`";
        }
        
        if (isset($data['joins']) && is_array($data['joins'])) {
            foreach ($data['joins'] as $join) {
                if (isset($join['table'], $join['on'])) {
                    $sql .= " JOIN {$join['table']} ON {$join['on']}";
                }
            }
        }

        if (isset($data['where'])) { 
            $where = is_array($data['where']) ? implode(" AND ", $data['where']) : $data['where']; // Assuming AND condition
            $sql .= " WHERE " . $where;
        }
        
        if (isset($data['sort'])) { 
            $order = is_array($data['sort']) ? implode(", ", $data['sort']) : $data['sort'];
            $sql .= " ORDER BY " . $order;
        }

        // Execute query
        $results = [];
        foreach ($this->databaseConnection->query($sql) as $row) {
            $results[] = $row;
        }

        $resultsJSON = json_encode($results, JSON_PRETTY_PRINT);
        $this->cacheHandler->set($query, $resultsJSON);

        // Return JSON-encoded results
        return $resultsJSON;
    }
}

$query = file_get_contents("php://input");

header("Content-Type: application/json");
if ($query) {
    // Initialize GraphQL handler
    $graph = new GraphQlHandler(new DatabaseHandler(), new CacheHandler());
    // Print the results
    echo $graph->query($query);
} else {
    echo json_encode(["response" => "ok"]);
}

?>
