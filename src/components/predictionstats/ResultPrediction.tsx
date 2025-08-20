import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { usePredictResults } from '../../hooks/usePredictResults';
import type { GameParameters } from '../../hooks/usePredictResults';
import { lycansColorScheme } from '../../types/api';

const SPECIAL_ROLES = [
  'Idiot du village',
  'Cannibale', 
  'Agent',
  'Espion',
  'Scientifique',
  'La Bête',
  'Chasseur de primes',
  'Vaudou'
];

const SOLO_ROLES = [
  'Serial Killer',
  'Zombie',
  'Pyromane',
  'Assassin',
  'Voleur'
];

export default function ResultPrediction() {
  const [parameters, setParameters] = useState<GameParameters>({
    nombreJoueurs: 12,
    nombreLoups: 3,
    roleTraitre: false,
    roleAmoureux: false,
    rolesSolo: [],
    rolesSpeciaux: []
  });

  const [showPrediction, setShowPrediction] = useState(false);
  const prediction = usePredictResults(parameters);

  const handleSpecialRoleChange = (role: string, checked: boolean) => {
    setParameters(prev => ({
      ...prev,
      rolesSpeciaux: checked 
        ? [...prev.rolesSpeciaux, role]
        : prev.rolesSpeciaux.filter(r => r !== role)
    }));
  };

  const handleSoloRoleChange = (role: string, checked: boolean) => {
    setParameters(prev => ({
      ...prev,
      rolesSolo: checked 
        ? [...prev.rolesSolo, role]
        : prev.rolesSolo.filter(r => r !== role)
    }));
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceText = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'Fiabilité élevée';
      case 'medium': return 'Fiabilité moyenne';
      case 'low': return 'Fiabilité faible';
      default: return 'Données insuffisantes';
    }
  };

  const pieData = prediction.predictions.map(pred => ({
    name: pred.camp,
    value: pred.winPercentage,
    color: lycansColorScheme[pred.camp as keyof typeof lycansColorScheme] || '#8884d8'
  }));

  const barData = prediction.predictions.map(pred => ({
    camp: pred.camp,
    percentage: pred.winPercentage,
    games: pred.gamesAnalyzed
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🎯 Prédiction de Résultats</CardTitle>
          <p className="text-sm text-gray-600">
            Prédisez les chances de victoire de chaque camp en fonction des paramètres de la partie
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Basic Parameters */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Paramètres de base</h3>
              
              <div>
                <Label htmlFor="players">Nombre de joueurs</Label>
                <Input
                  id="players"
                  type="number"
                  min="8"
                  max="15"
                  value={parameters.nombreJoueurs}
                  onChange={(e) => setParameters(prev => ({
                    ...prev,
                    nombreJoueurs: parseInt(e.target.value) || 8
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="wolves">Nombre de loups</Label>
                <Input
                  id="wolves"
                  type="number"
                  min="1"
                  max="4"
                  value={parameters.nombreLoups}
                  onChange={(e) => setParameters(prev => ({
                    ...prev,
                    nombreLoups: parseInt(e.target.value) || 1
                  }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="traitor"
                  checked={parameters.roleTraitre}
                  onCheckedChange={(checked) => setParameters(prev => ({
                    ...prev,
                    roleTraitre: checked as boolean
                  }))}
                />
                <Label htmlFor="traitor">Rôle Traître</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lovers"
                  checked={parameters.roleAmoureux}
                  onCheckedChange={(checked) => setParameters(prev => ({
                    ...prev,
                    roleAmoureux: checked as boolean
                  }))}
                />
                <Label htmlFor="lovers">Rôle Amoureux</Label>
              </div>
            </div>

            {/* Special Roles */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Rôles spéciaux</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {SPECIAL_ROLES.map(role => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`special-${role}`}
                      checked={parameters.rolesSpeciaux.includes(role)}
                      onCheckedChange={(checked) => handleSpecialRoleChange(role, checked as boolean)}
                    />
                    <Label htmlFor={`special-${role}`} className="text-sm">{role}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Solo Roles */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Rôles solo</h3>
              <div className="space-y-2">
                {SOLO_ROLES.map(role => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`solo-${role}`}
                      checked={parameters.rolesSolo.includes(role)}
                      onCheckedChange={(checked) => handleSoloRoleChange(role, checked as boolean)}
                    />
                    <Label htmlFor={`solo-${role}`} className="text-sm">{role}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Button 
            onClick={() => setShowPrediction(true)}
            className="w-full"
            size="lg"
          >
            🔮 Prédire les résultats
          </Button>
        </CardContent>
      </Card>

      {showPrediction && (
        <div className="space-y-6">
          {/* Prediction Summary */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Résultats de la prédiction</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {prediction.totalSimilarGames} parties similaires analysées
                </Badge>
                {prediction.mostSimilarGame && (
                  <Badge variant="outline">
                    Partie la plus similaire: #{prediction.mostSimilarGame.gameNumber} 
                    ({(prediction.mostSimilarGame.similarity * 100).toFixed(1)}% de similarité)
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {prediction.totalSimilarGames === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    Aucune partie similaire trouvée avec ces paramètres.
                    Essayez avec des paramètres différents.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div>
                    <h3 className="font-semibold mb-4">Répartition des victoires</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${typeof value === 'number' ? value.toFixed(1) : '0.0'}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${(value as number).toFixed(1)}%`, 'Probabilité']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bar Chart */}
                  <div>
                    <h3 className="font-semibold mb-4">Pourcentages de victoire</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="camp" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any, _unused: any, props: any) => [
                            `${typeof value === 'number' ? value.toFixed(1) : value}%`,
                            'Probabilité',
                            props && props.payload ? `(${props.payload.games} victoires)` : ''
                          ]}
                        />
                        <Bar 
                          dataKey="percentage" 
                          fill="#8884d8"
                          name="Probabilité de victoire (%)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Predictions */}
          {prediction.predictions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>📈 Prédictions détaillées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {prediction.predictions.map((pred, index) => (
                    <div 
                      key={pred.camp}
                      className={`p-4 rounded-lg border-2 ${
                        index === 0 ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold" style={{ 
                          color: lycansColorScheme[pred.camp as keyof typeof lycansColorScheme] 
                        }}>
                          {pred.camp}
                        </h3>
                        {index === 0 && <span className="text-xl">👑</span>}
                      </div>
                      
                      <div className="text-2xl font-bold mb-2">
                        {pred.winPercentage.toFixed(1)}%
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        {pred.gamesAnalyzed} victoires sur {prediction.totalSimilarGames} parties
                      </div>
                      
                      <Badge className={getConfidenceColor(pred.confidence)}>
                        {getConfidenceText(pred.confidence)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Most Similar Game */}
          {prediction.mostSimilarGame && (
            <Card>
              <CardHeader>
                <CardTitle>🎯 Partie la plus similaire</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="font-semibold">
                    Partie #{prediction.mostSimilarGame.gameNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    Similarité: {(prediction.mostSimilarGame.similarity * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Vainqueur:</span>{' '}
                    <span style={{ 
                      color: lycansColorScheme[prediction.mostSimilarGame.winner as keyof typeof lycansColorScheme] 
                    }}>
                      {prediction.mostSimilarGame.winner}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}