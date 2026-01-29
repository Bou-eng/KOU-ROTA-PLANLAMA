"""
Graph utilities for shortest path calculation using Dijkstra's algorithm.
No external APIs - only uses stored edges from database.
"""
import heapq
from typing import Dict, List, Tuple, Optional
from sqlalchemy.orm import Session
from app.models import Station, StationEdge


def build_adjacency(db: Session) -> Dict[int, List[Tuple[int, float]]]:
    """
    Build adjacency list from database edges.
    Returns: {station_id: [(neighbor_id, distance_km), ...]}
    
    Handles bidirectional edges: if is_bidirectional=True, adds both directions.
    Only includes active stations.
    """
    # Get all active station IDs
    active_stations = db.query(Station.id).filter(Station.is_active == True).all()
    active_station_ids = {s.id for s in active_stations}
    
    # Initialize adjacency list
    adjacency: Dict[int, List[Tuple[int, float]]] = {sid: [] for sid in active_station_ids}
    
    # Get all edges
    edges = db.query(StationEdge).all()
    
    for edge in edges:
        # Only include edges where both stations are active
        if edge.from_station_id not in active_station_ids or edge.to_station_id not in active_station_ids:
            continue
        
        # Add forward edge
        adjacency[edge.from_station_id].append((edge.to_station_id, edge.distance_km))
        
        # Add reverse edge if bidirectional
        if edge.is_bidirectional:
            adjacency[edge.to_station_id].append((edge.from_station_id, edge.distance_km))
    
    return adjacency


def dijkstra(
    adjacency: Dict[int, List[Tuple[int, float]]], 
    start_id: int, 
    end_id: int
) -> Tuple[Optional[float], Optional[List[int]]]:
    """
    Compute shortest path from start_id to end_id using Dijkstra's algorithm.
    
    Args:
        adjacency: {station_id: [(neighbor_id, distance_km), ...]}
        start_id: starting station ID
        end_id: destination station ID
    
    Returns:
        (total_distance_km, path_station_ids) or (None, None) if no path exists
        path_station_ids is ordered list from start to end
    """
    if start_id not in adjacency or end_id not in adjacency:
        return None, None
    
    if start_id == end_id:
        return 0.0, [start_id]
    
    # Priority queue: (distance, station_id)
    pq = [(0.0, start_id)]
    
    # Best known distances
    distances: Dict[int, float] = {start_id: 0.0}
    
    # Track previous node for path reconstruction
    previous: Dict[int, int] = {}
    
    visited = set()
    
    while pq:
        current_dist, current_id = heapq.heappop(pq)
        
        if current_id in visited:
            continue
        
        visited.add(current_id)
        
        # Found destination
        if current_id == end_id:
            # Reconstruct path
            path = []
            node = end_id
            while node in previous or node == start_id:
                path.append(node)
                if node == start_id:
                    break
                node = previous[node]
            path.reverse()
            return current_dist, path
        
        # Explore neighbors
        for neighbor_id, edge_distance in adjacency.get(current_id, []):
            if neighbor_id in visited:
                continue
            
            new_distance = current_dist + edge_distance
            
            if neighbor_id not in distances or new_distance < distances[neighbor_id]:
                distances[neighbor_id] = new_distance
                previous[neighbor_id] = current_id
                heapq.heappush(pq, (new_distance, neighbor_id))
    
    # No path found
    return None, None


def dijkstra_single_source(
    adjacency: Dict[int, List[Tuple[int, float]]], 
    start_id: int
) -> Dict[int, Tuple[float, List[int]]]:
    """
    Compute shortest paths from start_id to ALL reachable stations.
    
    Args:
        adjacency: {station_id: [(neighbor_id, distance_km), ...]}
        start_id: starting station ID
    
    Returns:
        {destination_id: (total_distance_km, path_station_ids)}
    """
    if start_id not in adjacency:
        return {}
    
    # Priority queue: (distance, station_id)
    pq = [(0.0, start_id)]
    
    # Best known distances
    distances: Dict[int, float] = {start_id: 0.0}
    
    # Track previous node for path reconstruction
    previous: Dict[int, int] = {}
    
    visited = set()
    
    while pq:
        current_dist, current_id = heapq.heappop(pq)
        
        if current_id in visited:
            continue
        
        visited.add(current_id)
        
        # Explore neighbors
        for neighbor_id, edge_distance in adjacency.get(current_id, []):
            if neighbor_id in visited:
                continue
            
            new_distance = current_dist + edge_distance
            
            if neighbor_id not in distances or new_distance < distances[neighbor_id]:
                distances[neighbor_id] = new_distance
                previous[neighbor_id] = current_id
                heapq.heappush(pq, (new_distance, neighbor_id))
    
    # Reconstruct all paths
    results: Dict[int, Tuple[float, List[int]]] = {}
    
    for dest_id in visited:
        if dest_id == start_id:
            results[dest_id] = (0.0, [start_id])
            continue
        
        # Reconstruct path
        path = []
        node = dest_id
        while node in previous or node == start_id:
            path.append(node)
            if node == start_id:
                break
            node = previous[node]
        path.reverse()
        
        results[dest_id] = (distances[dest_id], path)
    
    return results
